import { z } from 'zod';
import { UserSchema } from './user';
import { PostSchema } from './post';

export const ExplorePostSchema = z.object({
  id: z.string().uuid(),
  authorId: z.string().uuid(),
  imageUrl: z.string().url(),
  taggedGarments: z.array(z.string()),
  archetypes: z.array(z.string()),
  colors: z.array(z.string()),
  patternLevel: z.enum(['low', 'medium', 'high']),
  dressCode: z.string(),
  season: z.string(),
  vibeKeywords: z.array(z.string()),
  contextTags: z.array(z.string()).default([]),
  createdAt: z.string(),
  author: UserSchema.pick({
    id: true,
    displayName: true,
    avatarUrl: true,
    accountType: true,
  }).optional(),
});
export type ExplorePost = z.infer<typeof ExplorePostSchema>;

export const PersonalizedFeedPostSchema = PostSchema.extend({
  personalizationScore: z.number(),
  personalizationReasons: z.array(z.string()),
});
export type PersonalizedFeedPost = z.infer<typeof PersonalizedFeedPostSchema>;

export const PersonalizedExploreFeedResponseSchema = z.object({
  posts: z.array(PersonalizedFeedPostSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type PersonalizedExploreFeedResponse = z.infer<typeof PersonalizedExploreFeedResponseSchema>;
