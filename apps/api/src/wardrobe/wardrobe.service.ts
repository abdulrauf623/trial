import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BuilderWardrobeItem, BuilderWardrobeItemSource } from '@fashion/shared';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class WardrobeService {
  constructor(private prisma: PrismaService) {}

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
    if (existing) {
      return;
    }

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
}
