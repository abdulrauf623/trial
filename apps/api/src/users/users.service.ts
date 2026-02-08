import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  accountType: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowedByMe: boolean;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async getProfile(userId: string, viewerId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
        followers: {
          where: { followerId: viewerId },
          select: { followerId: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      accountType: user.accountType,
      followerCount: user._count.followers,
      followingCount: user._count.following,
      postCount: user._count.posts,
      isFollowedByMe: user.followers.length > 0,
    };
  }

  async getUserPosts(userId: string, viewerId: string, limit = 20, cursor?: string) {
    const posts = await this.prisma.post.findMany({
      where: { creatorId: userId },
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { createdAt: 'desc' },
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
          select: { likes: true },
        },
        likes: {
          where: { userId: viewerId },
          select: { userId: true },
        },
      },
    });

    const hasMore = posts.length > limit;
    const items = posts.slice(0, limit);

    return {
      posts: items.map((post: any) => ({
        id: post.id,
        creator: post.creator,
        caption: post.caption,
        imageUrls: post.imageUrls,
        tags: post.tags,
        likeCount: post._count.likes,
        isLikedByMe: post.likes.length > 0,
        createdAt: post.createdAt.toISOString(),
      })),
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    await this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  }

  async getFollowers(userId: string, limit = 50, cursor?: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: {
          followerId_followingId: {
            followerId: cursor.split('_')[0],
            followingId: cursor.split('_')[1],
          },
        },
      }),
      include: {
        follower: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            accountType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = follows.length > limit;
    const items = follows.slice(0, limit);

    return {
      users: items.map((f: any) => f.follower),
      nextCursor: hasMore && items.length > 0
        ? `${items[items.length - 1].followerId}_${items[items.length - 1].followingId}`
        : null,
      hasMore,
    };
  }

  async getFollowing(userId: string, limit = 50, cursor?: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: {
          followerId_followingId: {
            followerId: cursor.split('_')[0],
            followingId: cursor.split('_')[1],
          },
        },
      }),
      include: {
        following: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            accountType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = follows.length > limit;
    const items = follows.slice(0, limit);

    return {
      users: items.map((f: any) => f.following),
      nextCursor: hasMore && items.length > 0
        ? `${items[items.length - 1].followerId}_${items[items.length - 1].followingId}`
        : null,
      hasMore,
    };
  }
}
