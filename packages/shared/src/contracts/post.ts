import { z } from 'zod';
import { UserSchema } from './user';

export const ClothingItemSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  imageIndex: z.number().int().min(0),
  bbox: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      width: z.number().min(0).max(1),
      height: z.number().min(0).max(1),
    })
    .nullable(),
  category: z.string().nullable(),
  brand: z.string().nullable(),
  name: z.string().nullable(),
  price: z.number().nullable(),
  color: z.string().nullable(),
  pattern: z.string().nullable(),
  productUrl: z.string().url().nullable(),
  source: z.enum(['creator', 'ai_detected']),
  confidence: z.number().min(0).max(1).nullable(),
  imageUrl: z.string().url().nullable().optional(),
  createdAt: z.string(),
});

export type ClothingItem = z.infer<typeof ClothingItemSchema>;

export const PostTaggedGarmentSchema = z.object({
  id: z.string().uuid(),
  category: z.string().nullable(),
  brand: z.string().nullable(),
  name: z.string().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  removedBgUrl: z.string().url().nullable(),
});

export type PostTaggedGarment = z.infer<typeof PostTaggedGarmentSchema>;

export const PostSchema = z.object({
  id: z.string().uuid(),
  creator: UserSchema.pick({
    id: true,
    displayName: true,
    avatarUrl: true,
    accountType: true,
  }),
  caption: z.string().nullable(),
  imageUrls: z.array(z.string().url()),
  tags: z.array(z.string()),
  likeCount: z.number().int().min(0),
  isLikedByMe: z.boolean(),
  isSavedByMe: z.boolean().optional(),
  clothingItems: z.array(ClothingItemSchema).optional(),
  taggedGarments: z.array(PostTaggedGarmentSchema).optional(),
  createdAt: z.string(),
});

export type Post = z.infer<typeof PostSchema>;

export const FeedResponseSchema = z.object({
  posts: z.array(PostSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type FeedResponse = z.infer<typeof FeedResponseSchema>;
