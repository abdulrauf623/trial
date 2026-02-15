import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BuilderWardrobeItem,
  BuilderWardrobeItemSource,
  CreateOutfitInput,
  CreatedOutfit,
  GenerateOutfitsInput,
  GenerateOutfitsResponse,
  OutfitItem,
  StyleProfile,
  UpdateOutfitInput,
} from '@fashion/shared';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ProcessingService } from '../processing/processing.service';
import { deriveFormalityScore, inferSeasonTags } from '../user-garments/garment-metadata.util';
import { EngineGarment, generateCandidateOutfits } from './outfit-engine';

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 1800;

interface RenderLayer {
  input: Buffer;
  left: number;
  top: number;
}

interface PreparedLayer {
  imageBuffer: Buffer;
  width: number;
  height: number;
  left: number;
  top: number;
}

interface BuilderSourceRow extends BuilderWardrobeItem {
  sourceType: BuilderWardrobeItemSource;
  sourceRefId: string | null;
}

type BuilderSlot =
  | 'top'
  | 'bottom'
  | 'shoes'
  | 'onepiece'
  | 'outerwear'
  | 'midlayer'
  | 'accessory'
  | 'unknown';

@Injectable()
export class OutfitsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private processing: ProcessingService,
  ) {}

  // ===== Outfit recommendations (existing engine) =====

  async listUserOutfits(userId: string) {
    const outfits = await this.prisma.outfit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        garmentIds: true,
        occasionTag: true,
        seasonTag: true,
        formalityScore: true,
        colorPalette: true,
        silhouetteTag: true,
        explanations: true,
        createdAt: true,
      },
    });

    return { outfits };
  }

  async generate(userId: string, input: GenerateOutfitsInput): Promise<GenerateOutfitsResponse> {
    const styleProfile = await this.getStyleProfileOrFallback(userId);
    const wardrobeGarments = await this.getWardrobeGarments(userId);

    const outfits = generateCandidateOutfits(wardrobeGarments, styleProfile, {
      occasionTag: input.occasionTag,
      seasonTag: input.seasonTag,
      limit: input.limit,
    });

    const outfitModel = this.prisma.outfit;
    if (outfitModel && typeof outfitModel.deleteMany === 'function' && typeof outfitModel.createMany === 'function') {
      await outfitModel.deleteMany({ where: { userId } });
      if (outfits.length > 0) {
        await outfitModel.createMany({
          data: outfits.map((outfit) => ({
            userId,
            garmentIds: outfit.garmentIds,
            occasionTag: outfit.occasionTag,
            seasonTag: outfit.seasonTag,
            formalityScore: outfit.formalityScore,
            colorPalette: outfit.colorPalette,
            silhouetteTag: outfit.silhouetteTag,
            explanations: outfit.explanations,
          })),
        });
      }
    }

    return {
      outfits,
      totalCandidatesEvaluated: outfits.length,
    };
  }

  // ===== Collage outfit builder =====

  async listCreatedOutfits(userId: string): Promise<{ outfits: CreatedOutfit[] }> {
    const rows = await this.prisma.createdOutfit.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { items: true },
        },
        items: {
          orderBy: { zIndex: 'asc' },
          take: 8,
        },
      },
    });

    return {
      outfits: rows.map((row: any) => this.mapCreatedOutfit(row, true)),
    };
  }

  async getCreatedOutfit(userId: string, outfitId: string): Promise<CreatedOutfit> {
    const row = await this.prisma.createdOutfit.findFirst({
      where: {
        id: outfitId,
        ownerUserId: userId,
      },
      include: {
        _count: {
          select: { items: true },
        },
        items: {
          orderBy: { zIndex: 'asc' },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Outfit not found');
    }

    return this.mapCreatedOutfit(row, true);
  }

  async createOutfit(userId: string, input: CreateOutfitInput): Promise<CreatedOutfit> {
    const sourceById = await this.getBuilderSourceMap(userId);
    const rows = this.toCreatedOutfitItems(input.items, sourceById);

    const outfit = await this.prisma.createdOutfit.create({
      data: {
        ownerUserId: userId,
        name: sanitizeNullableString(input.name),
        backgroundStyle: input.backgroundStyle,
      },
    });

    if (rows.length > 0) {
      await this.prisma.createdOutfitItem.createMany({
        data: rows.map((row) => ({
          ...row,
          outfitId: outfit.id,
        })),
      });
    }

    return this.getCreatedOutfit(userId, outfit.id);
  }

  async createRandomOutfit(userId: string): Promise<{ outfit: CreatedOutfit }> {
    const sources = await this.listBuilderSources(userId);
    const input = this.buildRandomOutfitInput(sources);
    const created = await this.createOutfit(userId, input);
    return this.renderOutfit(userId, created.id);
  }

  async updateOutfit(userId: string, outfitId: string, input: UpdateOutfitInput): Promise<CreatedOutfit> {
    const existing = await this.prisma.createdOutfit.findFirst({
      where: {
        id: outfitId,
        ownerUserId: userId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Outfit not found');
    }

    await this.prisma.createdOutfit.update({
      where: { id: outfitId },
      data: {
        ...(input.name !== undefined ? { name: sanitizeNullableString(input.name) } : {}),
        ...(input.backgroundStyle ? { backgroundStyle: input.backgroundStyle } : {}),
      },
    });

    if (input.items) {
      const sourceById = await this.getBuilderSourceMap(userId);
      const rows = this.toCreatedOutfitItems(input.items, sourceById);

      await this.prisma.$transaction([
        this.prisma.createdOutfitItem.deleteMany({
          where: { outfitId },
        }),
        this.prisma.createdOutfitItem.createMany({
          data: rows.map((row) => ({
            ...row,
            outfitId,
          })),
        }),
      ]);
    }

    return this.getCreatedOutfit(userId, outfitId);
  }

  async deleteOutfit(userId: string, outfitId: string): Promise<void> {
    const result = await this.prisma.createdOutfit.deleteMany({
      where: {
        id: outfitId,
        ownerUserId: userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Outfit not found');
    }
  }

  async renderOutfit(userId: string, outfitId: string): Promise<{ outfit: CreatedOutfit }> {
    const outfit = await this.prisma.createdOutfit.findFirst({
      where: {
        id: outfitId,
        ownerUserId: userId,
      },
      include: {
        items: {
          orderBy: { zIndex: 'asc' },
        },
      },
    });

    if (!outfit) {
      throw new NotFoundException('Outfit not found');
    }

    if (!Array.isArray(outfit.items) || outfit.items.length === 0) {
      throw new BadRequestException('Cannot render an outfit without items');
    }

    const buffer = await this.renderOutfitToBuffer(userId, outfit.backgroundStyle, outfit.items);
    const coverImageUrl = await this.storage.uploadBuffer(
      userId,
      outfit.id,
      buffer,
      'image/png',
      'processed',
      'outfit',
    );

    await this.prisma.createdOutfit.update({
      where: { id: outfit.id },
      data: {
        coverImageUrl,
      },
    });

    return {
      outfit: await this.getCreatedOutfit(userId, outfit.id),
    };
  }

  async getBuilderWardrobeItems(
    userId: string,
    category?: string,
    source?: BuilderWardrobeItemSource | 'all',
  ): Promise<{ items: BuilderWardrobeItem[] }> {
    const rows = await this.listBuilderSources(userId);

    const normalizedCategory = category?.trim().toLowerCase();
    const normalizedSource = source === 'all' ? undefined : source;

    const filtered = rows.filter((row) => {
      if (normalizedCategory && row.category.trim().toLowerCase() !== normalizedCategory) {
        return false;
      }
      if (normalizedSource && row.sourceType !== normalizedSource) {
        return false;
      }
      return true;
    });

    return {
      items: filtered,
    };
  }

  private async getBuilderSourceMap(userId: string): Promise<Map<string, BuilderSourceRow>> {
    const rows = await this.listBuilderSources(userId);
    const map = new Map<string, BuilderSourceRow>();
    for (const row of rows) {
      map.set(row.id, row);
    }
    return map;
  }

  private async listBuilderSources(userId: string): Promise<BuilderSourceRow[]> {
    const [userGarments, savedItems] = await Promise.all([
      this.prisma.userGarment.findMany({
        where: { userId },
        include: { mediaUpload: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.wardrobeItem.findMany({
        where: { userId },
        include: {
          clothingItem: {
            include: {
              post: {
                select: {
                  imageUrls: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const uploads = userGarments
      .map((garment: any) => {
        const originalUrl: string | null =
          garment.mediaUpload?.originalUrl || garment.mediaUpload?.processedUrl || null;
        const cutoutUrl: string | null =
          garment.removedBgUrl ||
          garment.mediaUpload?.processedUrl ||
          garment.mediaUpload?.thumbnailUrl ||
          originalUrl;

        if (!originalUrl || !cutoutUrl) return null;

        return {
          id: `upload:${garment.id}`,
          ownerUserId: userId,
          sourceType: 'upload' as const,
          sourceRefId: garment.id,
          imageOriginalUrl: originalUrl,
          imageCutoutUrl: cutoutUrl,
          category: garment.category || 'other',
          colors: Array.isArray(garment.colors) ? garment.colors : [],
          brand: garment.brand || null,
          createdAt: garment.createdAt.toISOString(),
        } satisfies BuilderSourceRow;
      })
      .filter((item: BuilderSourceRow | null): item is BuilderSourceRow => Boolean(item));

    const saved = savedItems
      .map((item: any) => {
        const snapshot = item.snapshot || {};
        const clothingItem = item.clothingItem;

        const imageIndex = snapshot.imageIndex ?? clothingItem?.imageIndex ?? 0;
        const snapshotUrls = Array.isArray(snapshot.imageUrls) ? snapshot.imageUrls : [];
        const postUrls = Array.isArray(clothingItem?.post?.imageUrls) ? clothingItem.post.imageUrls : [];
        const imageOriginalUrl =
          snapshotUrls[imageIndex] || postUrls[imageIndex] || postUrls[0] || snapshotUrls[0] || null;
        if (!imageOriginalUrl) return null;

        const color = snapshot.color || clothingItem?.color || null;
        const colors = color ? [String(color).toLowerCase()] : [];

        return {
          id: `saved:${item.id}`,
          ownerUserId: userId,
          sourceType: 'saved_post' as const,
          sourceRefId: clothingItem?.id || null,
          imageOriginalUrl,
          imageCutoutUrl: imageOriginalUrl,
          category: snapshot.category || clothingItem?.category || 'other',
          colors,
          brand: snapshot.brand || clothingItem?.brand || null,
          createdAt: item.createdAt.toISOString(),
        } satisfies BuilderSourceRow;
      })
      .filter((item: BuilderSourceRow | null): item is BuilderSourceRow => Boolean(item));

    return [...uploads, ...saved].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  }

  private toCreatedOutfitItems(
    items: Array<{
      wardrobeItemId: string;
      x: number;
      y: number;
      scale: number;
      rotation: number;
      zIndex: number;
      mirror: boolean;
      labelText?: string | null | undefined;
      labelVisible: boolean;
    }>,
    sourceById: Map<string, BuilderSourceRow>,
  ) {
    return items.map((item) => {
      const source = sourceById.get(item.wardrobeItemId);
      if (!source) {
        throw new NotFoundException(`Wardrobe item not found: ${item.wardrobeItemId}`);
      }

      return {
        wardrobeItemId: item.wardrobeItemId,
        sourceType: source.sourceType,
        sourceRefId: source.sourceRefId,
        imageOriginalUrl: source.imageOriginalUrl,
        imageCutoutUrl: source.imageCutoutUrl,
        category: source.category,
        colors: source.colors,
        x: clamp(item.x, 0, 1),
        y: clamp(item.y, 0, 1),
        scale: clamp(item.scale, 0.2, 3),
        rotation: clamp(item.rotation, -360, 360),
        zIndex: item.zIndex,
        mirror: item.mirror,
        labelText: sanitizeNullableString(item.labelText),
        labelVisible: item.labelVisible,
      };
    });
  }

  private buildRandomOutfitInput(sources: BuilderSourceRow[]): CreateOutfitInput {
    const bySlot = this.splitBuilderSourcesBySlot(sources);
    const topCandidates = bySlot.top.length > 0 ? bySlot.top : bySlot.midlayer;
    const layerCandidates = bySlot.top.length > 0 ? bySlot.midlayer : [];
    const canBuildTwoPiece = topCandidates.length > 0 && bySlot.bottom.length > 0 && bySlot.shoes.length > 0;
    const canBuildOnePiece = bySlot.onepiece.length > 0 && bySlot.shoes.length > 0;

    if (!canBuildTwoPiece && !canBuildOnePiece) {
      throw new BadRequestException(
        'Need enough wardrobe pieces to build a full outfit. Add top + bottom + shoes, or one-piece + shoes.',
      );
    }

    const picked: BuilderSourceRow[] = [];
    const useOnePiece = canBuildOnePiece && (!canBuildTwoPiece || Math.random() < 0.35);

    if (useOnePiece) {
      picked.push(pickRandom(bySlot.onepiece));
      picked.push(pickRandom(bySlot.shoes));
      if (bySlot.outerwear.length > 0 && Math.random() < 0.45) {
        picked.push(pickRandom(bySlot.outerwear));
      }
      if (bySlot.accessory.length > 0 && Math.random() < 0.35) {
        picked.push(pickRandom(bySlot.accessory));
      }
    } else {
      picked.push(pickRandom(topCandidates));
      picked.push(pickRandom(bySlot.bottom));
      picked.push(pickRandom(bySlot.shoes));
      if (layerCandidates.length > 0 && Math.random() < 0.35) {
        picked.push(pickRandom(layerCandidates));
      }
      if (bySlot.outerwear.length > 0 && Math.random() < 0.35) {
        picked.push(pickRandom(bySlot.outerwear));
      }
      if (bySlot.accessory.length > 0 && Math.random() < 0.3) {
        picked.push(pickRandom(bySlot.accessory));
      }
    }

    const unique = Array.from(new Map(picked.map((item) => [item.id, item])).values());
    const positioned = this.positionRandomOutfitItems(unique);

    return {
      name: `Random Outfit ${new Date().toISOString().slice(5, 10).replace('-', '/')}`,
      backgroundStyle: 'solid',
      items: positioned,
    };
  }

  private splitBuilderSourcesBySlot(sources: BuilderSourceRow[]): Record<BuilderSlot, BuilderSourceRow[]> {
    const buckets: Record<BuilderSlot, BuilderSourceRow[]> = {
      top: [],
      bottom: [],
      shoes: [],
      onepiece: [],
      outerwear: [],
      midlayer: [],
      accessory: [],
      unknown: [],
    };

    for (const source of sources) {
      const slot = slotOfBuilderSource(source.category);
      buckets[slot].push(source);
    }

    return buckets;
  }

  private positionRandomOutfitItems(
    selected: BuilderSourceRow[],
  ): Array<{
    wardrobeItemId: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    zIndex: number;
    mirror: boolean;
    labelText?: string | null | undefined;
    labelVisible: boolean;
  }> {
    const withSlots = selected.map((item) => ({
      item,
      slot: slotOfBuilderSource(item.category),
    }));

    const hasOnePiece = withSlots.some(({ slot }) => slot === 'onepiece');

    const baseBySlot: Partial<
      Record<
        BuilderSlot,
        {
          x: number;
          y: number;
          scale: number;
          zIndex: number;
        }
      >
    > = hasOnePiece
      ? {
          onepiece: { x: 0.5, y: 0.48, scale: 1.08, zIndex: 2 },
          shoes: { x: 0.5, y: 0.82, scale: 1.02, zIndex: 1 },
          outerwear: { x: 0.5, y: 0.44, scale: 1.1, zIndex: 3 },
          accessory: { x: 0.73, y: 0.28, scale: 0.72, zIndex: 4 },
          midlayer: { x: 0.5, y: 0.45, scale: 1.02, zIndex: 3 },
        }
      : {
          top: { x: 0.5, y: 0.32, scale: 1.02, zIndex: 3 },
          midlayer: { x: 0.5, y: 0.34, scale: 1.02, zIndex: 4 },
          outerwear: { x: 0.5, y: 0.35, scale: 1.08, zIndex: 5 },
          bottom: { x: 0.5, y: 0.62, scale: 1.03, zIndex: 2 },
          shoes: { x: 0.5, y: 0.84, scale: 0.98, zIndex: 1 },
          accessory: { x: 0.75, y: 0.26, scale: 0.72, zIndex: 6 },
        };

    return withSlots.map(({ item, slot }, index) => {
      const fallback = { x: 0.5, y: 0.5, scale: 1, zIndex: index + 1 };
      const anchor = baseBySlot[slot] || fallback;
      const jitter = Math.random() * 0.02 - 0.01;
      const rotation = Math.random() * 8 - 4;

      return {
        wardrobeItemId: item.id,
        x: clamp(anchor.x + jitter, 0.1, 0.9),
        y: clamp(anchor.y + jitter, 0.1, 0.92),
        scale: clamp(anchor.scale + (Math.random() * 0.1 - 0.05), 0.3, 2.2),
        rotation,
        zIndex: anchor.zIndex,
        mirror: false,
        labelVisible: false,
      };
    });
  }

  private async renderOutfitToBuffer(userId: string, backgroundStyle: string, items: any[]): Promise<Buffer> {
    const background = await this.createBackgroundBuffer(backgroundStyle);
    const layers: RenderLayer[] = [];
    const cache = new Map<string, Buffer>();

    for (const item of items.sort((a: any, b: any) => a.zIndex - b.zIndex)) {
      const sourceBuffer = await this.resolveItemLayerBuffer(userId, item, cache);
      if (!sourceBuffer) continue;
      const prepared = await this.prepareLayer(sourceBuffer, item);
      const shadow = await this.createShadow(prepared.imageBuffer, prepared.width, prepared.height);

      if (shadow) {
        const shadowLayer = await this.fitLayerToCanvas(shadow, prepared.left + 8, prepared.top + 10);
        if (shadowLayer) layers.push(shadowLayer);
      }

      const imageLayer = await this.fitLayerToCanvas(prepared.imageBuffer, prepared.left, prepared.top);
      if (imageLayer) layers.push(imageLayer);
    }

    return sharp(background)
      .composite(layers)
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  private async resolveItemLayerBuffer(
    userId: string,
    item: any,
    cache: Map<string, Buffer>,
  ): Promise<Buffer | null> {
    const imageUrl: string | null = item.imageCutoutUrl || item.imageOriginalUrl || null;
    if (!imageUrl) return null;

    const sourceBuffer = await this.fetchImageBuffer(imageUrl, cache);
    const shouldAutoIsolate = await this.shouldAutoIsolateItem(item, sourceBuffer);
    if (!shouldAutoIsolate) {
      return sourceBuffer;
    }

    try {
      const isolated = await this.processing.isolateForOutfit(sourceBuffer);
      const hasTransparency = await this.bufferHasTransparency(isolated);
      if (!hasTransparency) {
        return sourceBuffer;
      }

      const cropped = await sharp(isolated)
        .trim()
        .png()
        .toBuffer()
        .catch(() => isolated);

      await this.persistIsolatedCutout(userId, item, cropped);
      return cropped;
    } catch (error) {
      console.warn('[Outfits] Failed to isolate layer, using original image:', error);
      return sourceBuffer;
    }
  }

  private async shouldAutoIsolateItem(item: any, sourceBuffer: Buffer): Promise<boolean> {
    if (item?.sourceType !== 'saved_post') {
      return false;
    }

    if (!item?.imageCutoutUrl || item.imageCutoutUrl === item.imageOriginalUrl) {
      return true;
    }

    // If there is no transparent alpha channel, this is likely still a rectangular source image.
    const hasTransparency = await this.bufferHasTransparency(sourceBuffer);
    return !hasTransparency;
  }

  private async bufferHasTransparency(buffer: Buffer): Promise<boolean> {
    const image = sharp(buffer).rotate();
    const metadata = await image.metadata();
    if (!metadata.hasAlpha) {
      return false;
    }
    const stats = await image.stats();
    const alpha = stats.channels[3];
    return Boolean(alpha && alpha.min < 255);
  }

  private async persistIsolatedCutout(userId: string, item: any, isolatedBuffer: Buffer): Promise<void> {
    if (!item?.id) {
      return;
    }

    try {
      const cutoutUrl = await this.storage.uploadBuffer(
        userId,
        item.id,
        isolatedBuffer,
        'image/png',
        'processed',
        'outfit',
      );

      await this.prisma.createdOutfitItem.update({
        where: { id: item.id },
        data: {
          imageCutoutUrl: cutoutUrl,
        },
      });
    } catch (error) {
      console.warn('[Outfits] Failed to persist isolated cutout URL:', error);
    }
  }

  /**
   * Crop/offset a layer so it fits within the canvas bounds.
   * Returns null if the layer is entirely outside the canvas.
   */
  private async fitLayerToCanvas(
    input: Buffer,
    left: number,
    top: number,
  ): Promise<RenderLayer | null> {
    const meta = await sharp(input).metadata();
    const layerW = meta.width || 1;
    const layerH = meta.height || 1;

    // Calculate the visible region of the layer within the canvas
    const cropLeft = Math.max(0, -left);
    const cropTop = Math.max(0, -top);
    const visibleLeft = Math.max(0, left);
    const visibleTop = Math.max(0, top);
    const visibleRight = Math.min(CANVAS_WIDTH, left + layerW);
    const visibleBottom = Math.min(CANVAS_HEIGHT, top + layerH);
    const visibleW = visibleRight - visibleLeft;
    const visibleH = visibleBottom - visibleTop;

    if (visibleW <= 0 || visibleH <= 0) {
      return null; // Entirely outside the canvas
    }

    // If the layer already fits, return as-is
    if (cropLeft === 0 && cropTop === 0 && visibleW === layerW && visibleH === layerH) {
      return { input, left: visibleLeft, top: visibleTop };
    }

    // Crop the layer to the visible region
    const cropped = await sharp(input)
      .extract({ left: cropLeft, top: cropTop, width: visibleW, height: visibleH })
      .png()
      .toBuffer();

    return { input: cropped, left: visibleLeft, top: visibleTop };
  }

  private async createBackgroundBuffer(style: string): Promise<Buffer> {
    const normalized = String(style || 'solid').toLowerCase();

    if (normalized === 'gradient') {
      const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="48%" stop-color="#eef2ff"/>
      <stop offset="100%" stop-color="#f4f4f5"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="url(#bg)"/>
</svg>`;
      return sharp(Buffer.from(svg)).png().toBuffer();
    }

    if (normalized === 'paper') {
      const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="noise">
      <feTurbulence baseFrequency="0.95" numOctaves="2" stitchTiles="stitch" type="fractalNoise"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.018"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect x="0" y="0" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="#f7f4eb"/>
  <rect x="0" y="0" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" filter="url(#noise)"/>
</svg>`;
      return sharp(Buffer.from(svg)).png().toBuffer();
    }

    return sharp({
      create: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        channels: 4,
        background: {
          r: 245,
          g: 247,
          b: 250,
          alpha: 1,
        },
      },
    })
      .png()
      .toBuffer();
  }

  private async prepareLayer(input: Buffer, item: any): Promise<PreparedLayer> {
    const source = sharp(input).ensureAlpha().rotate();
    const sourceMeta = await source.metadata();
    const sourceWidth = sourceMeta.width || 1;
    const sourceHeight = sourceMeta.height || 1;

    const baseScale = scaleForCategory(item.category);
    const maxEdge = Math.max(80, Math.round(CANVAS_WIDTH * baseScale * clamp(item.scale || 1, 0.2, 3)));

    const resizeWidth = sourceWidth >= sourceHeight ? maxEdge : Math.round((sourceWidth / sourceHeight) * maxEdge);
    const resizeHeight = sourceHeight > sourceWidth ? maxEdge : Math.round((sourceHeight / sourceWidth) * maxEdge);

    let transformed = source.resize({
      width: Math.max(48, resizeWidth),
      height: Math.max(48, resizeHeight),
      fit: 'inside',
      withoutEnlargement: false,
    });

    if (item.mirror) {
      transformed = transformed.flop();
    }

    transformed = transformed.rotate(item.rotation || 0, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    const imageBuffer = await transformed.png().toBuffer();
    const outMeta = await sharp(imageBuffer).metadata();
    const outWidth = outMeta.width || 1;
    const outHeight = outMeta.height || 1;

    const centerX = clamp(item.x ?? 0.5, 0, 1) * CANVAS_WIDTH;
    const centerY = clamp(item.y ?? 0.5, 0, 1) * CANVAS_HEIGHT;

    const left = Math.round(centerX - outWidth / 2);
    const top = Math.round(centerY - outHeight / 2);

    return {
      imageBuffer,
      width: outWidth,
      height: outHeight,
      left,
      top,
    };
  }

  private async createShadow(input: Buffer, width: number, height: number): Promise<Buffer | null> {
    try {
      const alpha = await sharp(input)
        .ensureAlpha()
        .extractChannel('alpha')
        .blur(10)
        .png()
        .toBuffer();

      return await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0.22 },
        },
      })
        .composite([
          {
            input: alpha,
            blend: 'dest-in',
          },
        ])
        .png()
        .toBuffer();
    } catch {
      return null;
    }
  }

  private async fetchImageBuffer(url: string, cache: Map<string, Buffer>): Promise<Buffer> {
    const existing = cache.get(url);
    if (existing) {
      return existing;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new BadRequestException(`Failed to fetch wardrobe image (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    cache.set(url, buffer);
    return buffer;
  }

  private mapCreatedOutfit(row: any, withItems: boolean): CreatedOutfit {
    const items: OutfitItem[] | undefined =
      withItems && Array.isArray(row.items)
        ? row.items.map((item: any) => ({
            id: item.id,
            outfitId: item.outfitId,
            wardrobeItemId: item.wardrobeItemId,
            sourceType: item.sourceType,
            sourceRefId: item.sourceRefId || null,
            imageOriginalUrl: item.imageOriginalUrl,
            imageCutoutUrl: item.imageCutoutUrl,
            category: item.category || null,
            colors: Array.isArray(item.colors) ? item.colors : [],
            x: item.x,
            y: item.y,
            scale: item.scale,
            rotation: item.rotation,
            zIndex: item.zIndex,
            mirror: item.mirror,
            labelText: item.labelText || null,
            labelVisible: Boolean(item.labelVisible),
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          }))
        : undefined;

    return {
      id: row.id,
      ownerUserId: row.ownerUserId,
      name: row.name || null,
      coverImageUrl: row.coverImageUrl || null,
      backgroundStyle: row.backgroundStyle,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      itemCount: row._count?.items ?? items?.length ?? 0,
      ...(items ? { items } : {}),
    };
  }

  private async getStyleProfileOrFallback(userId: string): Promise<StyleProfile> {
    const model = this.prisma.styleProfile;
    const row =
      model && typeof model.findUnique === 'function'
        ? await model.findUnique({ where: { userId } })
        : null;
    if (row) {
      return {
        userId: row.userId,
        contexts: row.contexts,
        dressCodes: row.dressCodes,
        climate: row.climate,
        rainy: row.rainy,
        fitPreference: row.fitPreference,
        archetypes: row.archetypes,
        riskLevel: row.riskLevel,
        preferredNeutrals: row.preferredNeutrals,
        likedColors: row.likedColors,
        avoidedColors: row.avoidedColors,
        patternComfort: row.patternComfort,
        shoesPreference: row.shoesPreference,
        accessoriesLevel: row.accessoriesLevel,
        comfortConstraints: row.comfortConstraints,
        shoppingInterest: row.shoppingInterest,
        budgetBand: row.budgetBand,
        heightRange: row.heightRange || undefined,
        proportions: row.proportions || undefined,
        shoulderWidth: row.shoulderWidth || undefined,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    }

    return {
      userId,
      contexts: ['Weekend casual'],
      dressCodes: ['Casual'],
      climate: 'Mixed',
      rainy: false,
      fitPreference: 'Regular',
      archetypes: ['Minimal'],
      riskLevel: 'Balanced',
      preferredNeutrals: ['Black', 'White', 'Grey'],
      likedColors: ['blue'],
      avoidedColors: [],
      patternComfort: 'Some patterns',
      shoesPreference: ['Sneakers'],
      accessoriesLevel: 'Minimal',
      comfortConstraints: [],
      shoppingInterest: 'balanced',
      budgetBand: 'mid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private async getWardrobeGarments(userId: string): Promise<EngineGarment[]> {
    const [userGarments, savedItems] = await Promise.all([
      this.prisma.userGarment.findMany({
        where: { userId },
        include: { mediaUpload: true },
      }),
      this.prisma.wardrobeItem.findMany({
        where: { userId },
        include: {
          clothingItem: {
            include: {
              post: {
                select: {
                  imageUrls: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const uploads = userGarments
      .map((garment: any) => ({
        id: garment.id,
        userId: garment.userId,
        imageUrl: garment.mediaUpload?.processedUrl || garment.mediaUpload?.originalUrl,
        removedBgUrl: garment.removedBgUrl || garment.mediaUpload?.processedUrl || null,
        category: garment.category || 'top',
        subcategory: garment.subcategory,
        colors: garment.colors || [],
        patternType: garment.patternType || garment.pattern || null,
        textureTags: garment.textureTags || [],
        formalityScore: garment.formalityScore || deriveFormalityScore({
          category: garment.category,
          subcategory: garment.subcategory,
          material: garment.material,
          tags: garment.tags,
        }),
        seasonTags: garment.seasonTags?.length
          ? garment.seasonTags
          : inferSeasonTags({
              category: garment.category,
              material: garment.material,
              textureTags: garment.textureTags,
            }),
        brand: garment.brand,
        silhouetteTag: garment.silhouetteTag,
        tags: garment.tags || [],
        createdAt: garment.createdAt.toISOString(),
      }))
      .filter((g: EngineGarment) => Boolean(g.imageUrl));

    const saved = savedItems
      .map((item: any) => {
        const snapshot = item.snapshot || {};
        const clothingItem = item.clothingItem;

        const imageIndex = snapshot.imageIndex || clothingItem?.imageIndex || 0;
        const snapshotUrls = Array.isArray(snapshot.imageUrls) ? snapshot.imageUrls : [];
        const postUrls = clothingItem?.post?.imageUrls || [];
        const imageUrl = snapshotUrls[imageIndex] || postUrls[imageIndex] || postUrls[0] || snapshotUrls[0] || null;

        const category = snapshot.category || clothingItem?.category || 'top';
        const subcategory = snapshot.subcategory || null;
        const material = snapshot.material || null;

        const color = snapshot.color || clothingItem?.color || null;

        return {
          id: clothingItem?.id || item.id,
          userId,
          imageUrl,
          removedBgUrl: null,
          category,
          subcategory,
          colors: color ? [String(color).toLowerCase()] : [],
          patternType: snapshot.pattern || clothingItem?.pattern || null,
          textureTags: snapshot.textureTags || [],
          formalityScore: deriveFormalityScore({
            category,
            subcategory,
            material,
            tags: snapshot.tags || [],
          }),
          seasonTags: inferSeasonTags({
            category,
            material,
            textureTags: snapshot.textureTags || [],
          }),
          brand: snapshot.brand || clothingItem?.brand || null,
          silhouetteTag: snapshot.silhouetteTag || null,
          tags: snapshot.tags || [],
          createdAt: item.createdAt.toISOString(),
        } as EngineGarment;
      })
      .filter((g: EngineGarment) => Boolean(g.imageUrl));

    return dedupeById([...uploads, ...saved]);
  }
}

function sanitizeNullableString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function dedupeById(garments: EngineGarment[]): EngineGarment[] {
  const seen = new Set<string>();
  const result: EngineGarment[] = [];

  for (const garment of garments) {
    if (seen.has(garment.id)) continue;
    seen.add(garment.id);
    result.push(garment);
  }

  return result;
}

function scaleForCategory(category: string | null | undefined): number {
  const key = String(category || '').toLowerCase();
  if (containsAny(key, ['outerwear', 'coat', 'jacket', 'blazer'])) return 0.46;
  if (containsAny(key, ['dress', 'jumpsuit', 'onepiece'])) return 0.48;
  if (containsAny(key, ['top', 'shirt', 'tee', 'blouse', 'sweater', 'hoodie'])) return 0.42;
  if (containsAny(key, ['bottom', 'pant', 'jean', 'skirt', 'short'])) return 0.42;
  if (containsAny(key, ['shoe', 'sneaker', 'boot', 'heel', 'loafer', 'sandal'])) return 0.25;
  if (containsAny(key, ['bag', 'hat', 'belt', 'accessory', 'jewelry'])) return 0.22;
  return 0.34;
}

function containsAny(value: string, needles: string[]): boolean {
  const normalized = value.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

function slotOfBuilderSource(category: string | null | undefined): BuilderSlot {
  const value = String(category || '').toLowerCase();
  if (containsAny(value, ['dress', 'jumpsuit', 'romper', 'overall'])) return 'onepiece';
  if (containsAny(value, ['shoe', 'sneaker', 'boot', 'loafer', 'heel', 'sandal'])) return 'shoes';
  if (containsAny(value, ['coat', 'jacket', 'blazer', 'trench', 'parka', 'outerwear'])) return 'outerwear';
  if (containsAny(value, ['hoodie', 'cardigan', 'vest', 'sweater'])) return 'midlayer';
  if (containsAny(value, ['pant', 'trouser', 'jean', 'skirt', 'short', 'bottom'])) return 'bottom';
  if (containsAny(value, ['bag', 'hat', 'belt', 'scarf', 'accessory', 'jewelry', 'watch'])) return 'accessory';
  if (containsAny(value, ['top', 'shirt', 'tee', 'tshirt', 'blouse', 'tank'])) return 'top';
  return 'unknown';
}

function pickRandom<T>(items: T[]): T {
  if (items.length === 0) {
    throw new BadRequestException('Not enough wardrobe items to build a random outfit.');
  }
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
