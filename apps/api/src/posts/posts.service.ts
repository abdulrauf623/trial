import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Post } from '@fashion/shared';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';
import sharp from 'sharp';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private queue: QueueService,
  ) {}

  async savePost(userId: string, postId: string): Promise<void> {
    console.log(`[SavePost] User ${userId.substring(0, 8)} saving post ${postId.substring(0, 8)}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found. Please sign in again.');
    }

    // First, save the post (upsert to handle duplicates)
    await this.prisma.savedPost.upsert({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
      create: {
        userId,
        postId,
      },
      update: {}, // No update needed, just don't fail
    });

    // Then, add all clothing items from the post to the wardrobe
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        clothingItems: {
          include: {
            post: {
              select: {
                imageUrls: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    let addedFromClothingItems = 0;
    if (post.clothingItems.length > 0) {
      console.log(`[SavePost] Found ${post.clothingItems.length} clothing items`);

      // Add each clothing item to wardrobe (skip if already exists)
      for (const clothingItem of post.clothingItems) {
        if (this.isMirroredTaggedGarment(clothingItem.bbox)) {
          continue;
        }

        // Check if already in wardrobe
        const existing = await this.prisma.wardrobeItem.findFirst({
          where: {
            userId,
            clothingItemId: clothingItem.id,
          },
        });

        if (!existing) {
          // Create snapshot
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
              clothingItemId: clothingItem.id,
              snapshot,
            },
          });
          addedFromClothingItems++;
        }
      }
      console.log(
        `[SavePost] Added ${addedFromClothingItems} clothing items to wardrobe (${post.clothingItems.length - addedFromClothingItems} already existed)`,
      );
    } else {
      console.log(`[SavePost] No clothing items to add`);
    }

    const addedFromTaggedGarments = await this.copyTaggedGarmentsFromUserPost(userId, postId);
    if (addedFromTaggedGarments > 0) {
      console.log(`[SavePost] Added ${addedFromTaggedGarments} tagged garments to wardrobe`);
    }

    void this.importPostClothingItemsAsUserGarments(userId, post).catch((error) => {
      console.error(`[SavePost] Failed to import clothing items into uploaded garments for post ${postId}:`, error);
    });
  }

  async unsavePost(userId: string, postId: string): Promise<void> {
    // Only delete the saved post, keep wardrobe items
    await this.prisma.savedPost.deleteMany({
      where: {
        userId,
        postId,
      },
    });
  }

  async saveTaggedGarment(userId: string, postId: string, garmentId: string): Promise<void> {
    const tag = await this.prisma.userPostTag.findUnique({
      where: {
        postId_garmentId: {
          postId,
          garmentId,
        },
      },
      include: {
        garment: {
          include: {
            mediaUpload: true,
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException('Tagged garment not found on this post');
    }

    await this.cloneTaggedGarmentForUser(userId, tag.garment);
  }

  async getPostById(postId: string, userId: string): Promise<Post> {
    const [post, userPost] = await Promise.all([
      this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          creator: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              accountType: true,
            },
          },
          clothingItems: {
            orderBy: { imageIndex: 'asc' },
          },
          _count: {
            select: { likes: true },
          },
          likes: {
            where: { userId },
            select: { userId: true },
          },
          savedPosts: {
            where: { userId },
            select: { userId: true },
          },
        },
      }),
      this.prisma.userPost.findUnique({
        where: { id: postId },
        include: {
          taggedGarments: {
            include: {
              garment: {
                include: {
                  mediaUpload: {
                    select: {
                      thumbnailUrl: true,
                      processedUrl: true,
                      originalUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return {
      id: post.id,
      creator: {
        id: post.creator.id,
        displayName: post.creator.displayName,
        avatarUrl: post.creator.avatarUrl,
        accountType: post.creator.accountType,
      },
      caption: post.caption,
      imageUrls: post.imageUrls,
      tags: post.tags,
      likeCount: post._count.likes,
      isLikedByMe: post.likes.length > 0,
      isSavedByMe: post.savedPosts.length > 0,
      clothingItems: post.clothingItems.map((item: any) => ({
        id: item.id,
        postId: item.postId,
        imageIndex: item.imageIndex,
        bbox: item.bbox as any,
        category: item.category,
        brand: item.brand,
        name: item.name,
        price: item.price ? parseFloat(item.price.toString()) : null,
        color: item.color,
        pattern: item.pattern,
        productUrl: item.productUrl,
        source: item.source,
        confidence: item.confidence,
        imageUrl: this.resolveClothingItemImageUrl(item, post.imageUrls),
        createdAt: item.createdAt.toISOString(),
      })),
      taggedGarments:
        userPost?.taggedGarments?.map((tag: any) => ({
          id: tag.garment.id,
          category: tag.garment.category,
          brand: tag.garment.brand,
          name: tag.garment.subcategory || tag.garment.category || null,
          thumbnailUrl: tag.garment.mediaUpload?.thumbnailUrl || null,
          removedBgUrl:
            tag.garment.removedBgUrl ||
            tag.garment.mediaUpload?.processedUrl ||
            tag.garment.mediaUpload?.originalUrl ||
            null,
        })) || [],
      createdAt: post.createdAt.toISOString(),
    };
  }

  private async copyTaggedGarmentsFromUserPost(userId: string, postId: string): Promise<number> {
    const userPost = await this.prisma.userPost.findUnique({
      where: { id: postId },
      include: {
        taggedGarments: {
          include: {
            garment: {
              include: {
                mediaUpload: true,
              },
            },
          },
        },
      },
    });

    if (!userPost || !userPost.taggedGarments?.length) {
      return 0;
    }

    let created = 0;
    for (const tag of userPost.taggedGarments) {
      const didCreate = await this.cloneTaggedGarmentForUser(userId, tag.garment);
      if (didCreate) {
        created += 1;
      }
    }

    return created;
  }

  private async cloneTaggedGarmentForUser(userId: string, garment: any): Promise<boolean> {
    if (!garment?.mediaUploadId) {
      return false;
    }

    if (garment.userId === userId) {
      return false;
    }

    const existing = await this.prisma.userGarment.findFirst({
      where: {
        userId,
        mediaUploadId: garment.mediaUploadId,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return false;
    }

    const copiedRemovedBgUrl =
      garment.removedBgUrl || garment.mediaUpload?.processedUrl || garment.mediaUpload?.originalUrl || null;

    await this.prisma.userGarment.create({
      data: {
        userId,
        mediaUploadId: garment.mediaUploadId,
        category: garment.category || null,
        subcategory: garment.subcategory || null,
        colors: Array.isArray(garment.colors) ? garment.colors : [],
        dominantHex: garment.dominantHex || null,
        confidence: garment.confidence || null,
        pattern: garment.pattern || null,
        patternType: garment.patternType || garment.pattern || null,
        textureTags: Array.isArray(garment.textureTags) ? garment.textureTags : [],
        formalityScore: garment.formalityScore || 3,
        seasonTags: Array.isArray(garment.seasonTags) ? garment.seasonTags : [],
        removedBgUrl: copiedRemovedBgUrl,
        silhouetteTag: garment.silhouetteTag || null,
        material: garment.material || null,
        brand: garment.brand || null,
        size: garment.size || null,
        tags: Array.isArray(garment.tags) ? garment.tags : [],
        notes: garment.notes || 'Saved from a tagged post item',
      },
    });

    return true;
  }

  private resolveClothingItemImageUrl(item: any, postImageUrls: string[]): string | null {
    const bbox = item?.bbox && typeof item.bbox === 'object' ? (item.bbox as Record<string, any>) : null;
    if (bbox?.cutoutUrl && typeof bbox.cutoutUrl === 'string') {
      return bbox.cutoutUrl;
    }
    if (bbox?.thumbnailUrl && typeof bbox.thumbnailUrl === 'string') {
      return bbox.thumbnailUrl;
    }
    if (Array.isArray(postImageUrls) && typeof item?.imageIndex === 'number' && postImageUrls[item.imageIndex]) {
      return postImageUrls[item.imageIndex];
    }
    if (Array.isArray(postImageUrls) && postImageUrls[0]) {
      return postImageUrls[0];
    }
    return null;
  }

  private isMirroredTaggedGarment(bbox: unknown): boolean {
    if (!bbox || typeof bbox !== 'object') return false;
    const payload = bbox as Record<string, unknown>;
    return typeof payload.sourceGarmentId === 'string' && payload.sourceGarmentId.length > 0;
  }

  private async importPostClothingItemsAsUserGarments(userId: string, post: any): Promise<void> {
    if (!post || !Array.isArray(post.clothingItems) || post.clothingItems.length === 0) {
      return;
    }

    let importedCount = 0;
    for (const clothingItem of post.clothingItems) {
      if (this.isMirroredTaggedGarment(clothingItem?.bbox)) {
        continue;
      }

      const sourceMarker = this.sourceMarkerForClothingItem(clothingItem.id);
      const existing = await this.prisma.userGarment.findFirst({
        where: {
          userId,
          tags: { has: sourceMarker },
        },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      try {
        const sourceUrl = this.resolveClothingItemImageUrl(
          clothingItem,
          clothingItem?.post?.imageUrls || post.imageUrls || [],
        );
        if (!sourceUrl) {
          continue;
        }

        const sourceBuffer = await this.fetchImageBuffer(sourceUrl);
        const focusedBuffer = await this.cropImageToBoundingBox(sourceBuffer, clothingItem?.bbox);
        const normalizedOriginal = await sharp(focusedBuffer)
          .rotate()
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();

        const baseMetadata: Record<string, unknown> = {
          importedFrom: 'saved_post',
          sourcePostId: post.id,
          sourceClothingItemId: clothingItem.id,
          sourceImageUrl: sourceUrl,
          sourceBbox: clothingItem?.bbox || null,
        };

        const media = await this.prisma.mediaUpload.create({
          data: {
            userId,
            status: 'pending',
            metadata: baseMetadata,
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
            notes: `Imported from post ${post.id}`,
          },
        });

        await this.queue.enqueueGarmentProcessing(media.id);
        importedCount += 1;
      } catch (error) {
        console.error(`[SavePost] Failed to import clothing item ${clothingItem?.id}:`, error);
      }
    }

    if (importedCount > 0) {
      console.log(`[SavePost] Queued ${importedCount} clothing item(s) for background removal import`);
    }
  }

  private sourceMarkerForClothingItem(clothingItemId: string): string {
    return `source_post_item:${clothingItemId}`;
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
    if (!parsed) {
      return buffer;
    }

    const image = sharp(buffer).rotate();
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    if (!width || !height) {
      return buffer;
    }

    const left = Math.max(0, Math.floor(parsed.x * width));
    const top = Math.max(0, Math.floor(parsed.y * height));
    const extractWidth = Math.min(width - left, Math.max(1, Math.floor(parsed.width * width)));
    const extractHeight = Math.min(height - top, Math.max(1, Math.floor(parsed.height * height)));

    if (extractWidth < 24 || extractHeight < 24) {
      return buffer;
    }

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

    // Only trust normalized [0..1] boxes.
    if (x > 1 || y > 1 || width > 1 || height > 1) {
      return null;
    }

    const normalized = {
      x: this.clamp(x, 0, 1),
      y: this.clamp(y, 0, 1),
      width: this.clamp(width, 0, 1),
      height: this.clamp(height, 0, 1),
    };

    if (normalized.width <= 0 || normalized.height <= 0) {
      return null;
    }

    return normalized;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
