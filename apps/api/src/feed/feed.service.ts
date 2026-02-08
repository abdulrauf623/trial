import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { Post, FeedResponse } from '@fashion/shared';

@Injectable()
export class FeedService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getFeed(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<FeedResponse> {
    const cacheKey = `feed:user:${userId}:cursor:${cursor || 'initial'}:limit:${limit}`;

    // Try to get from cache
    const cached = await this.cacheManager.get<FeedResponse>(cacheKey);
    if (cached) {
      console.log(`[Feed] Cache HIT for user ${userId}`);
      return cached;
    }

    console.log(`[Feed] Cache MISS for user ${userId}, querying DB...`);

    // Parse cursor if provided
    let cursorPostId: string | undefined;
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        cursorPostId = decoded;
      } catch (error) {
        console.error('[Feed] Invalid cursor:', error);
      }
    }

    // Fetch posts with relations
    const posts = await this.prisma.post.findMany({
      take: limit + 1,
      ...(cursorPostId && {
        skip: 1,
        cursor: { id: cursorPostId },
      }),
      orderBy: [
        { engagementScore: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            accountType: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
        likes: {
          where: { userId },
          select: { userId: true },
        },
      },
    });

    const hasMore = posts.length > limit;
    const items = posts.slice(0, limit);

    // Format response
    const formattedPosts: Post[] = items.map((post: any) => ({
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
      createdAt: post.createdAt.toISOString(),
    }));

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastPost = items[items.length - 1];
      nextCursor = Buffer.from(lastPost.id).toString('base64');
    }

    const response: FeedResponse = {
      posts: formattedPosts,
      nextCursor,
      hasMore,
    };

    // Cache the result
    await this.cacheManager.set(cacheKey, response, 300000);

    return response;
  }

  async likePost(userId: string, postId: string): Promise<void> {
    await this.prisma.like.create({
      data: {
        userId,
        postId,
      },
    });

    await this.updateEngagementScore(postId);
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    await this.prisma.like.delete({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    await this.updateEngagementScore(postId);
  }

  private async updateEngagementScore(postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        _count: {
          select: { likes: true },
        },
      },
    });

    if (post) {
      const engagementScore = Math.log(1 + post._count.likes);
      await this.prisma.post.update({
        where: { id: postId },
        data: { engagementScore },
      });
    }
  }
}
