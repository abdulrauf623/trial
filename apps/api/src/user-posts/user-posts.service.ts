import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserPostDto {
  imageUrl: string;
  mediaUploadId?: string;
  caption?: string;
  taggedGarmentIds?: string[];
}

export interface UserPostResponse {
  id: string;
  userId: string;
  imageUrl: string;
  processedUrl: string | null;
  caption: string | null;
  taggedGarments: Array<{
    id: string;
    category: string | null;
    thumbnailUrl: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

@Injectable()
export class UserPostsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a user post with optional garment tags
   */
  async createPost(userId: string, dto: CreateUserPostDto): Promise<UserPostResponse> {
    let resolvedImageUrl = dto.imageUrl;
    let taggedGarments: any[] = [];

    if (dto.mediaUploadId) {
      const media = await this.prisma.mediaUpload.findUnique({
        where: { id: dto.mediaUploadId },
      });

      if (!media) {
        throw new NotFoundException('Media upload not found');
      }

      if (media.userId !== userId) {
        throw new BadRequestException('Not authorized to use this media upload');
      }

      // Prefer canonical URL from media upload record if available.
      if (media.originalUrl) {
        resolvedImageUrl = media.originalUrl;
      }
    }

    // Verify tagged garments belong to user
    if (dto.taggedGarmentIds && dto.taggedGarmentIds.length > 0) {
      taggedGarments = await this.prisma.userGarment.findMany({
        where: {
          id: { in: dto.taggedGarmentIds },
          userId,
        },
        select: {
          id: true,
          category: true,
          subcategory: true,
          brand: true,
          colors: true,
          pattern: true,
          patternType: true,
          confidence: true,
          removedBgUrl: true,
          mediaUploadId: true,
          tags: true,
          mediaUpload: {
            select: {
              thumbnailUrl: true,
              processedUrl: true,
              originalUrl: true,
            },
          },
        },
      });

      if (taggedGarments.length !== dto.taggedGarmentIds.length) {
        throw new BadRequestException('Some tagged garments not found or not owned by user');
      }
    }

    // Create post
    const post = await this.prisma.userPost.create({
      data: {
        userId,
        imageUrl: resolvedImageUrl,
        mediaUploadId: dto.mediaUploadId,
        caption: dto.caption,
        taggedGarments: dto.taggedGarmentIds
          ? {
              create: dto.taggedGarmentIds.map(garmentId => ({
                garmentId,
              })),
            }
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        taggedGarments: {
          include: {
            garment: {
              include: {
                mediaUpload: {
                  select: {
                    thumbnailUrl: true,
                  },
                },
              },
            },
          },
        },
        mediaUpload: true,
      },
    });

    // Mirror into legacy posts table so Explore/Profile/PostDetail surfaces include user-created posts.
    // Use the same ID to keep cross-surface navigation consistent.
    const legacyTags = this.buildLegacyTags(dto.caption, taggedGarments);
    try {
      await this.prisma.post.create({
        data: {
          id: post.id,
          creatorId: userId,
          caption: dto.caption || null,
          imageUrls: [resolvedImageUrl],
          tags: legacyTags,
          engagementScore: 0,
          clothingItems:
            taggedGarments.length > 0
              ? {
                  create: taggedGarments.map((garment: any) => ({
                    imageIndex: 0,
                    bbox: {
                      x: 0,
                      y: 0,
                      width: 1,
                      height: 1,
                      sourceGarmentId: garment.id,
                      sourceMediaUploadId: garment.mediaUploadId,
                      cutoutUrl:
                        garment.removedBgUrl ||
                        garment.mediaUpload?.processedUrl ||
                        garment.mediaUpload?.originalUrl ||
                        null,
                      thumbnailUrl: garment.mediaUpload?.thumbnailUrl || null,
                    },
                    category: garment.category || garment.subcategory || null,
                    brand: garment.brand || null,
                    name: this.buildLegacyItemName(garment),
                    color: Array.isArray(garment.colors) && garment.colors.length > 0 ? garment.colors[0] : null,
                    pattern: garment.patternType || garment.pattern || null,
                    source: 'creator',
                    confidence: garment.confidence || null,
                  })),
                }
              : undefined,
        },
      });
    } catch (error) {
      // Keep data integrity: if feed post creation fails, rollback user_post creation.
      await this.prisma.userPost.delete({ where: { id: post.id } }).catch(() => {});
      throw error;
    }

    console.log(`[UserPosts] Created post ${post.id} for user ${userId}`);

    return this.formatPostResponse(post);
  }

  /**
   * List user posts with pagination
   */
  async listPosts(userId?: string, limit: number = 20, cursor?: string) {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (cursor) {
      where.id = { lt: cursor };
    }

    const posts = await this.prisma.userPost.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        taggedGarments: {
          include: {
            garment: {
              include: {
                mediaUpload: {
                  select: {
                    thumbnailUrl: true,
                  },
                },
              },
            },
          },
        },
        mediaUpload: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
    });

    const hasMore = posts.length > limit;
    const items = posts.slice(0, limit);

    return {
      posts: items.map((p: any) => this.formatPostResponse(p)),
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * Get a single post
   */
  async getPost(postId: string): Promise<UserPostResponse> {
    const post = await this.prisma.userPost.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        taggedGarments: {
          include: {
            garment: {
              include: {
                mediaUpload: {
                  select: {
                    thumbnailUrl: true,
                  },
                },
              },
            },
          },
        },
        mediaUpload: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.formatPostResponse(post);
  }

  /**
   * Delete a user post
   */
  async deletePost(userId: string, postId: string): Promise<void> {
    const post = await this.prisma.userPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new BadRequestException('Not authorized to delete this post');
    }

    await this.prisma.userPost.delete({
      where: { id: postId },
    });

    // Delete mirrored legacy post if present.
    await this.prisma.post.deleteMany({
      where: {
        id: postId,
        creatorId: userId,
      },
    });

    console.log(`[UserPosts] Deleted post ${postId}`);
  }

  private buildLegacyTags(caption?: string, taggedGarments: Array<{ category: string | null; tags?: string[] }> = []): string[] {
    const normalized = new Set<string>();

    if (caption) {
      const matches = caption.match(/#([a-zA-Z0-9_]+)/g) || [];
      for (const raw of matches) {
        normalized.add(raw.replace('#', '').toLowerCase());
      }
    }

    for (const garment of taggedGarments) {
      if (garment.category) {
        normalized.add(garment.category.toLowerCase());
      }
      for (const tag of garment.tags || []) {
        normalized.add(tag.toLowerCase());
      }
    }

    return Array.from(normalized).slice(0, 10);
  }

  private buildLegacyItemName(garment: {
    category?: string | null;
    subcategory?: string | null;
    brand?: string | null;
  }): string | null {
    if (garment.brand && garment.subcategory) {
      return `${garment.brand} ${garment.subcategory}`;
    }
    return garment.brand || garment.subcategory || garment.category || null;
  }

  private formatPostResponse(post: any): UserPostResponse {
    return {
      id: post.id,
      userId: post.userId,
      imageUrl: post.imageUrl,
      processedUrl: post.mediaUpload?.processedUrl || post.processedUrl || null,
      caption: post.caption,
      taggedGarments: (post.taggedGarments || []).map((tag: any) => ({
        id: tag.garment.id,
        category: tag.garment.category,
        thumbnailUrl: tag.garment.mediaUpload?.thumbnailUrl || null,
      })),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      user: {
        id: post.user.id,
        displayName: post.user.displayName,
        avatarUrl: post.user.avatarUrl,
      },
    };
  }
}
