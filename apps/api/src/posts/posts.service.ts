import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Post } from '@fashion/shared';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

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

    if (post && post.clothingItems.length > 0) {
      console.log(`[SavePost] Found ${post.clothingItems.length} clothing items`);

      // Add each clothing item to wardrobe (skip if already exists)
      let addedCount = 0;
      for (const clothingItem of post.clothingItems) {
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
          addedCount++;
        }
      }
      console.log(`[SavePost] Added ${addedCount} new items to wardrobe (${post.clothingItems.length - addedCount} already existed)`);
    } else {
      console.log(`[SavePost] No clothing items to add`);
    }
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

  async getPostById(postId: string, userId: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({
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
    });

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
        createdAt: item.createdAt.toISOString(),
      })),
      createdAt: post.createdAt.toISOString(),
    };
  }
}
