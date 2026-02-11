import { z } from 'zod';
import { MediaStatusSchema } from './uploads';

export const CreateUserGarmentSchema = z.object({
  mediaUploadId: z.string().uuid(),
  notes: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  colors: z.array(z.string()).optional(),
  pattern: z.string().optional(),
  patternType: z.string().optional(),
  textureTags: z.array(z.string()).optional(),
  formalityScore: z.number().int().min(1).max(5).optional(),
  seasonTags: z.array(z.string()).optional(),
  silhouetteTag: z.string().optional(),
  material: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type CreateUserGarment = z.infer<typeof CreateUserGarmentSchema>;

export const UserGarmentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  mediaUploadId: z.string().uuid(),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  colors: z.array(z.string()),
  dominantHex: z.string().nullable(),
  confidence: z.number().nullable(),
  pattern: z.string().nullable(),
  patternType: z.string().nullable(),
  textureTags: z.array(z.string()),
  formalityScore: z.number().int().min(1).max(5),
  seasonTags: z.array(z.string()),
  silhouetteTag: z.string().nullable(),
  material: z.string().nullable(),
  brand: z.string().nullable(),
  size: z.string().nullable(),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
  originalUrl: z.string().url().nullable(),
  processedUrl: z.string().url().nullable(),
  removedBgUrl: z.string().url().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  status: MediaStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserGarment = z.infer<typeof UserGarmentSchema>;

export const ListUserGarmentsResponseSchema = z.object({
  garments: z.array(UserGarmentSchema),
  total: z.number(),
  categories: z.array(z.string()),
});
export type ListUserGarmentsResponse = z.infer<typeof ListUserGarmentsResponseSchema>;

export const UpdateUserGarmentSchema = z.object({
  notes: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  colors: z.array(z.string()).optional(),
  pattern: z.string().optional(),
  patternType: z.string().optional(),
  textureTags: z.array(z.string()).optional(),
  formalityScore: z.number().int().min(1).max(5).optional(),
  seasonTags: z.array(z.string()).optional(),
  silhouetteTag: z.string().optional(),
  material: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type UpdateUserGarment = z.infer<typeof UpdateUserGarmentSchema>;
