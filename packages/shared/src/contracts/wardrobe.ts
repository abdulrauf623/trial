import { z } from 'zod';
import { ClothingItemSchema } from './post';

export const WardrobeItemSchema = z.object({
  id: z.string().uuid(),
  clothingItemId: z.string().uuid(),
  addedAt: z.string(),
  clothingItem: ClothingItemSchema.extend({
    post: z.object({
      imageUrls: z.array(z.string().url()),
    }),
  }),
});

export type WardrobeItem = z.infer<typeof WardrobeItemSchema>;

export const WardrobeResponseSchema = z.array(WardrobeItemSchema);
export type WardrobeResponse = z.infer<typeof WardrobeResponseSchema>;
