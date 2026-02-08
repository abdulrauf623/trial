import { z } from 'zod';
import { UserSchema } from './user';

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
  accountType: z.enum(['user', 'creator']),
  followerCount: z.number().int().min(0),
  followingCount: z.number().int().min(0),
  postCount: z.number().int().min(0),
  isFollowedByMe: z.boolean(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserListResponseSchema = z.object({
  users: z.array(UserSchema.pick({
    id: true,
    displayName: true,
    avatarUrl: true,
    accountType: true,
  })),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type UserListResponse = z.infer<typeof UserListResponseSchema>;
