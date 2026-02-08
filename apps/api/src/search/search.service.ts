import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchOptions {
  query: string;
  category?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  limit?: number;
  cursor?: string;
}

export interface SearchResult {
  posts: any[];
  items: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchPosts(userId: string, options: SearchOptions): Promise<SearchResult> {
    const {
      query,
      category,
      color,
      minPrice,
      maxPrice,
      tags,
      limit = 20,
      cursor,
    } = options;

    const where: Record<string, unknown> = {
      OR: [
        {
          caption: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          tags: {
            hasSome: query.toLowerCase().split(' '),
          },
        },
        {
          clothingItems: {
            some: {
              OR: [
                {
                  name: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  brand: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                ...(category ? [{ category }] : []),
                ...(color ? [{ color }] : []),
              ],
            },
          },
        },
      ],
      ...(tags && tags.length > 0 ? { tags: { hasSome: tags } } : {}),
    };

    const posts = await this.prisma.post.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
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
        clothingItems: {
          where: {
            ...(category ? { category } : {}),
            ...(color ? { color } : {}),
            ...(minPrice !== undefined || maxPrice !== undefined
              ? {
                  price: {
                    ...(minPrice !== undefined ? { gte: minPrice } : {}),
                    ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
                  },
                }
              : {}),
          },
        },
        _count: {
          select: { likes: true },
        },
        likes: {
          where: { userId },
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
      items: [],
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  async searchItems(options: SearchOptions) {
    const {
      query,
      category,
      color,
      minPrice,
      maxPrice,
      limit = 20,
      cursor,
    } = options;

    const where: Record<string, unknown> = {
      OR: [
        {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          brand: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ],
      ...(category ? { category } : {}),
      ...(color ? { color } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
    };

    const items = await this.prisma.clothingItem.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            creator: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                accountType: true,
              },
            },
          },
        },
      },
    });

    const hasMore = items.length > limit;
    const resultItems = items.slice(0, limit);

    return {
      posts: [],
      items: resultItems.map((item: any) => ({
        id: item.id,
        postId: item.postId,
        imageIndex: item.imageIndex,
        category: item.category,
        brand: item.brand,
        name: item.name,
        price: item.price ? parseFloat(item.price.toString()) : null,
        color: item.color,
        pattern: item.pattern,
        productUrl: item.productUrl,
        post: {
          id: item.post.id,
          imageUrls: item.post.imageUrls,
          creator: item.post.creator,
        },
      })),
      nextCursor: hasMore && resultItems.length > 0 ? resultItems[resultItems.length - 1].id : null,
      hasMore,
    };
  }

  async searchSimilarItems(itemId: string, limit = 20): Promise<any[]> {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return [];
    }

    // Try vector similarity search if embedding exists
    try {
      const itemWithEmbedding = (await this.prisma.$queryRaw`
        SELECT embedding::text FROM clothing_items WHERE id = ${itemId}::uuid
      `) as Array<{ embedding: string }>;

      if (itemWithEmbedding.length > 0 && itemWithEmbedding[0].embedding) {
        // Use pgvector for similarity search
        const similarItems = (await this.prisma.$queryRaw`
          SELECT id, 1 - (embedding <=> (SELECT embedding FROM clothing_items WHERE id = ${itemId}::uuid)) as similarity
          FROM clothing_items
          WHERE id != ${itemId}::uuid
          AND embedding IS NOT NULL
          ORDER BY embedding <=> (SELECT embedding FROM clothing_items WHERE id = ${itemId}::uuid)
          LIMIT ${limit}
        `) as Array<{
          id: string;
          similarity: number;
        }>;

        if (similarItems.length > 0) {
          const itemIds = similarItems.map((si: { id: string }) => si.id);
          const items = await this.prisma.clothingItem.findMany({
            where: { id: { in: itemIds } },
            include: {
              post: {
                include: {
                  creator: {
                    select: {
                      id: true,
                      displayName: true,
                      avatarUrl: true,
                      accountType: true,
                    },
                  },
                },
              },
            },
          });

          return items.map((item: any) => ({
            id: item.id,
            postId: item.postId,
            imageIndex: item.imageIndex,
            category: item.category,
            brand: item.brand,
            name: item.name,
            price: item.price ? parseFloat(item.price.toString()) : null,
            color: item.color,
            pattern: item.pattern,
            productUrl: item.productUrl,
            post: {
              id: item.post.id,
              imageUrls: item.post.imageUrls,
              creator: item.post.creator,
            },
          }));
        }
      }
    } catch (error) {
      console.warn('[Search] Vector search failed, falling back to category/color search:', error);
    }

    // Fallback to category and color similarity
    const similarItems = await this.prisma.clothingItem.findMany({
      where: {
        id: { not: itemId },
        OR: [
          { category: item.category },
          { color: item.color },
        ],
      },
      take: limit,
      include: {
        post: {
          include: {
            creator: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                accountType: true,
              },
            },
          },
        },
      },
    });

    return similarItems.map((item: any) => ({
      id: item.id,
      postId: item.postId,
      imageIndex: item.imageIndex,
      category: item.category,
      brand: item.brand,
      name: item.name,
      price: item.price ? parseFloat(item.price.toString()) : null,
      color: item.color,
      pattern: item.pattern,
      productUrl: item.productUrl,
      post: {
        id: item.post.id,
        imageUrls: item.post.imageUrls,
        creator: item.post.creator,
      },
    }));
  }

  async getSuggestions(query: string, limit = 5): Promise<string[]> {
    // Get tag suggestions based on partial query
    const posts = await this.prisma.post.findMany({
      where: {
        tags: {
          isEmpty: false,
        },
      },
      select: {
        tags: true,
      },
      take: 100,
    });

    const allTags = new Set<string>();
    posts.forEach((post: { tags: string[] }) => {
      post.tags.forEach((tag: string) => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          allTags.add(tag);
        }
      });
    });

    return Array.from(allTags).slice(0, limit);
  }
}
