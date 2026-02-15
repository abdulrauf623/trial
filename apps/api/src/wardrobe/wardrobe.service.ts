import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BuilderWardrobeItem, BuilderWardrobeItemSource } from '@fashion/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';
import sharp from 'sharp';

export interface WardrobeItem {
  id: string;
  clothingItemId: string;
  addedAt: string;
  clothingItem: {
    id: string;
    postId: string;
    imageIndex: number;
    bbox: any;
    category: string | null;
    brand: string | null;
    name: string | null;
    price: number | null;
    color: string | null;
    pattern: string | null;
    productUrl: string | null;
    source: string;
    confidence: number | null;
    post: {
      imageUrls: string[];
    };
  };
}

export interface WardrobeWorthStats {
  totalValue: number;
  pricedItems: number;
  totalItems: number;
  currency: 'USD';
}

@Injectable()
export class WardrobeService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private queue: QueueService,
  ) {}

  async getBuilderWardrobe(
    userId: string,
    filter?: string,
    source?: BuilderWardrobeItemSource | 'all',
  ): Promise<{ items: BuilderWardrobeItem[] }> {
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
        } satisfies BuilderWardrobeItem;
      })
      .filter((item: BuilderWardrobeItem | null): item is BuilderWardrobeItem => Boolean(item));

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
        } satisfies BuilderWardrobeItem;
      })
      .filter((item: BuilderWardrobeItem | null): item is BuilderWardrobeItem => Boolean(item));

    const normalizedFilter = filter?.trim().toLowerCase();
    const normalizedSource = source === 'all' ? undefined : source;

    const items = [...uploads, ...saved]
      .filter((item) => {
        if (normalizedFilter && item.category.trim().toLowerCase() !== normalizedFilter) return false;
        if (normalizedSource && item.sourceType !== normalizedSource) return false;
        return true;
      })
      .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

    return { items };
  }

  async getWardrobeWorth(userId: string): Promise<WardrobeWorthStats> {
    const items = await this.prisma.wardrobeItem.findMany({
      where: { userId },
      select: {
        snapshot: true,
        clothingItem: {
          select: {
            price: true,
          },
        },
      },
    });

    let totalValue = 0;
    let pricedItems = 0;

    for (const item of items) {
      const relationPrice = item.clothingItem?.price
        ? parseFloat(item.clothingItem.price.toString())
        : null;
      const snapshotPrice = this.extractSnapshotPrice(item.snapshot);
      const numericPrice = relationPrice ?? snapshotPrice;

      if (typeof numericPrice === 'number' && Number.isFinite(numericPrice) && numericPrice > 0) {
        totalValue += numericPrice;
        pricedItems += 1;
      }
    }

    return {
      totalValue: roundCurrency(totalValue),
      pricedItems,
      totalItems: items.length,
      currency: 'USD',
    };
  }

  async addToWardrobe(userId: string, clothingItemId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found. Please sign in again.');
    }

    // Fetch the clothing item to create a snapshot
    const clothingItem = await this.prisma.clothingItem.findUnique({
      where: { id: clothingItemId },
      include: {
        post: {
          select: {
            imageUrls: true,
          },
        },
      },
    });

    if (!clothingItem) {
      throw new NotFoundException('Clothing item not found');
    }

    const existing = await this.prisma.wardrobeItem.findFirst({
      where: {
        userId,
        clothingItemId,
      },
      select: { id: true },
    });
    if (!existing) {
      // Create snapshot of the clothing item
      const snapshot = {
        id: clothingItem.id,
        postId: clothingItem.postId,
        imageIndex: clothingItem.imageIndex,
        bbox: clothingItem.bbox,
        category: clothingItem.category,
        brand: clothingItem.brand,
        name: clothingItem.name,
        price: clothingItem.price ? parseFloat(clothingItem.price.toString()) : null,
        color: clothingItem.color,
        pattern: clothingItem.pattern,
        productUrl: clothingItem.productUrl,
        source: clothingItem.source,
        confidence: clothingItem.confidence,
        imageUrls: clothingItem.post.imageUrls,
      };

      await this.prisma.wardrobeItem.create({
        data: {
          userId,
          clothingItemId,
          snapshot,
        },
      });
    }

    void this.importClothingItemAsUploadedGarment(userId, clothingItem).catch((error) => {
      console.error(`[Wardrobe] Failed to import clothing item ${clothingItemId} as uploaded garment:`, error);
    });
  }

  async removeFromWardrobe(userId: string, itemId: string): Promise<void> {
    await this.prisma.wardrobeItem.delete({
      where: {
        id: itemId,
        userId,
      },
    });
  }

  async getFilterOptions(userId: string): Promise<{ categories: string[]; colors: string[] }> {
    const items = await this.prisma.wardrobeItem.findMany({
      where: { userId },
      include: {
        clothingItem: {
          select: {
            category: true,
            color: true,
          },
        },
      },
    });

    const categories = new Set<string>();
    const colors = new Set<string>();

    items.forEach((item: any) => {
      if (item.clothingItem?.category) {
        categories.add(item.clothingItem.category);
      }
      if (item.clothingItem?.color) {
        colors.add(item.clothingItem.color);
      }
    });

    return {
      categories: Array.from(categories).sort(),
      colors: Array.from(colors).sort(),
    };
  }

  async getWardrobe(
    userId: string,
    category?: string,
    color?: string,
  ): Promise<WardrobeItem[]> {
    const items = await this.prisma.wardrobeItem.findMany({
      where: {
        userId,
        ...(category && {
          clothingItem: {
            category,
          },
        }),
        ...(color && {
          clothingItem: {
            color,
          },
        }),
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter out items where clothingItem is null and map to response format
    return items
      .filter((item: any) => item.clothingItem !== null)
      .map((item: any) => ({
        id: item.id,
        clothingItemId: item.clothingItemId!,
        addedAt: item.createdAt.toISOString(),
        clothingItem: {
          id: item.clothingItem!.id,
          postId: item.clothingItem!.postId,
          imageIndex: item.clothingItem!.imageIndex,
          bbox: item.clothingItem!.bbox,
          category: item.clothingItem!.category,
          brand: item.clothingItem!.brand,
          name: item.clothingItem!.name,
          price: item.clothingItem!.price ? parseFloat(item.clothingItem!.price.toString()) : null,
          color: item.clothingItem!.color,
          pattern: item.clothingItem!.pattern,
          productUrl: item.clothingItem!.productUrl,
          source: item.clothingItem!.source,
          confidence: item.clothingItem!.confidence,
          post: {
            imageUrls: item.clothingItem!.post.imageUrls,
          },
        },
      }));
  }

  private async importClothingItemAsUploadedGarment(userId: string, clothingItem: any): Promise<void> {
    const sourceMarker = this.sourceMarkerForClothingItem(clothingItem.id);
    const existingGarment = await this.prisma.userGarment.findFirst({
      where: {
        userId,
        tags: { has: sourceMarker },
      },
      select: { id: true },
    });

    if (existingGarment) {
      return;
    }

    const sourceUrl = this.resolveClothingItemImageUrl(clothingItem);
    if (!sourceUrl) {
      return;
    }

    const sourceBuffer = await this.fetchImageBuffer(sourceUrl);
    const focusedBuffer = await this.cropImageToBoundingBox(sourceBuffer, clothingItem.bbox);
    const normalizedOriginal = await sharp(focusedBuffer)
      .rotate()
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    const metadata: Record<string, unknown> = {
      importedFrom: 'saved_post_item',
      sourcePostId: clothingItem.postId,
      sourceClothingItemId: clothingItem.id,
      sourceImageUrl: sourceUrl,
      sourceBbox: clothingItem.bbox || null,
    };

    const media = await this.prisma.mediaUpload.create({
      data: {
        userId,
        status: 'pending',
        metadata,
      },
    });

    const originalUrl = await this.storage.uploadBuffer(
      userId,
      media.id,
      normalizedOriginal,
      'image/jpeg',
      'original',
      'garment',
    );

    await this.prisma.mediaUpload.update({
      where: { id: media.id },
      data: {
        status: 'processing',
        originalUrl,
      },
    });

    await this.prisma.userGarment.create({
      data: {
        userId,
        mediaUploadId: media.id,
        category: clothingItem.category || null,
        subcategory: null,
        colors: this.normalizeColorToList(clothingItem.color),
        dominantHex: null,
        confidence: clothingItem.confidence || null,
        pattern: clothingItem.pattern || null,
        patternType: clothingItem.pattern || null,
        textureTags: [],
        formalityScore: 3,
        seasonTags: [],
        removedBgUrl: null,
        silhouetteTag: null,
        material: null,
        brand: clothingItem.brand || null,
        size: null,
        tags: ['imported_from_post', sourceMarker],
        notes: `Imported from post ${clothingItem.postId}`,
      },
    });

    await this.queue.enqueueGarmentProcessing(media.id);
  }

  private sourceMarkerForClothingItem(clothingItemId: string): string {
    return `source_post_item:${clothingItemId}`;
  }

  private resolveClothingItemImageUrl(clothingItem: any): string | null {
    const bbox = clothingItem?.bbox && typeof clothingItem.bbox === 'object'
      ? (clothingItem.bbox as Record<string, unknown>)
      : null;

    if (bbox?.cutoutUrl && typeof bbox.cutoutUrl === 'string') {
      return bbox.cutoutUrl;
    }

    const imageUrls = Array.isArray(clothingItem?.post?.imageUrls) ? clothingItem.post.imageUrls : [];
    const imageIndex = typeof clothingItem?.imageIndex === 'number' ? clothingItem.imageIndex : 0;
    return imageUrls[imageIndex] || imageUrls[0] || null;
  }

  private normalizeColorToList(color: unknown): string[] {
    if (typeof color !== 'string' || !color.trim()) {
      return [];
    }
    return [color.trim().toLowerCase()];
  }

  private async fetchImageBuffer(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch source image (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async cropImageToBoundingBox(buffer: Buffer, bbox: unknown): Promise<Buffer> {
    const parsed = this.parseBoundingBox(bbox);
    if (!parsed) return buffer;

    const image = sharp(buffer).rotate();
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    if (!width || !height) return buffer;

    const left = Math.max(0, Math.floor(parsed.x * width));
    const top = Math.max(0, Math.floor(parsed.y * height));
    const extractWidth = Math.min(width - left, Math.max(1, Math.floor(parsed.width * width)));
    const extractHeight = Math.min(height - top, Math.max(1, Math.floor(parsed.height * height)));
    if (extractWidth < 24 || extractHeight < 24) return buffer;

    return image
      .extract({
        left,
        top,
        width: extractWidth,
        height: extractHeight,
      })
      .png()
      .toBuffer();
  }

  private parseBoundingBox(
    bbox: unknown,
  ): { x: number; y: number; width: number; height: number } | null {
    if (!bbox || typeof bbox !== 'object') {
      return null;
    }

    const payload = bbox as Record<string, unknown>;
    const x = Number(payload.x);
    const y = Number(payload.y);
    const width = Number(payload.width);
    const height = Number(payload.height);

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
      return null;
    }
    if (width <= 0 || height <= 0) {
      return null;
    }
    if (x > 1 || y > 1 || width > 1 || height > 1) {
      return null;
    }

    return {
      x: this.clamp(x, 0, 1),
      y: this.clamp(y, 0, 1),
      width: this.clamp(width, 0, 1),
      height: this.clamp(height, 0, 1),
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private extractSnapshotPrice(snapshot: unknown): number | null {
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }

    const value = Number((snapshot as Record<string, unknown>).price);
    return Number.isFinite(value) ? value : null;
  }
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
