import { z } from 'zod';

export const CreateUserPostSchema = z.object({
  imageUrl: z.string().url(),
  mediaUploadId: z.string().uuid().optional(),
  caption: z.string().optional(),
  taggedGarmentIds: z.array(z.string().uuid()).optional(),
});
export type CreateUserPost = z.infer<typeof CreateUserPostSchema>;

export const UserPostTaggedGarmentSchema = z.object({
  id: z.string().uuid(),
  category: z.string().nullable(),
  thumbnailUrl: z.string().url().nullable(),
});
export type UserPostTaggedGarment = z.infer<typeof UserPostTaggedGarmentSchema>;

export const UserPostSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  imageUrl: z.string().url(),
  processedUrl: z.string().url().nullable(),
  caption: z.string().nullable(),
  taggedGarments: z.array(UserPostTaggedGarmentSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    avatarUrl: z.string().url().nullable(),
  }),
});
export type UserPost = z.infer<typeof UserPostSchema>;

export const ListUserPostsResponseSchema = z.object({
  posts: z.array(UserPostSchema),
  nextCursor: z.string().uuid().nullable(),
  hasMore: z.boolean(),
});
export type ListUserPostsResponse = z.infer<typeof ListUserPostsResponseSchema>;
