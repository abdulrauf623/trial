import { z } from 'zod';

export const GarmentForOutfitSchema = z.object({
  id: z.string(),
  userId: z.string().uuid(),
  imageUrl: z.string().url(),
  removedBgUrl: z.string().url().nullable(),
  category: z.string(),
  subcategory: z.string().nullable(),
  colors: z.array(z.string()),
  patternType: z.string().nullable(),
  textureTags: z.array(z.string()),
  formalityScore: z.number().int().min(1).max(5),
  seasonTags: z.array(z.string()),
  brand: z.string().nullable(),
  createdAt: z.string(),
});
export type GarmentForOutfit = z.infer<typeof GarmentForOutfitSchema>;

export const OutfitRecommendationSchema = z.object({
  id: z.string().optional(),
  userId: z.string().uuid().optional(),
  garmentIds: z.array(z.string()),
  occasionTag: z.string(),
  seasonTag: z.string(),
  formalityScore: z.number().int().min(1).max(5),
  colorPalette: z.array(z.string()),
  silhouetteTag: z.string(),
  explanations: z.array(z.string()),
  score: z.number(),
  createdAt: z.string().optional(),
});
export type OutfitRecommendation = z.infer<typeof OutfitRecommendationSchema>;

export const GenerateOutfitsInputSchema = z.object({
  occasionTag: z.string().optional(),
  seasonTag: z.string().optional(),
  limit: z.number().int().min(1).max(20).optional(),
});
export type GenerateOutfitsInput = z.infer<typeof GenerateOutfitsInputSchema>;

export const GenerateOutfitsResponseSchema = z.object({
  outfits: z.array(OutfitRecommendationSchema),
  totalCandidatesEvaluated: z.number().int().nonnegative(),
});
export type GenerateOutfitsResponse = z.infer<typeof GenerateOutfitsResponseSchema>;

// ===== Collage Outfit Builder (Create/Edit/Render) =====

export const BuilderWardrobeItemSourceSchema = z.enum(['upload', 'saved_post']);
export type BuilderWardrobeItemSource = z.infer<typeof BuilderWardrobeItemSourceSchema>;

export const BuilderWardrobeItemSchema = z.object({
  id: z.string(),
  ownerUserId: z.string().uuid(),
  sourceType: BuilderWardrobeItemSourceSchema,
  sourceRefId: z.string().nullable(),
  imageOriginalUrl: z.string().url(),
  imageCutoutUrl: z.string().url(),
  category: z.string(),
  colors: z.array(z.string()),
  brand: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type BuilderWardrobeItem = z.infer<typeof BuilderWardrobeItemSchema>;

export const OutfitBackgroundStyleSchema = z.enum(['solid', 'gradient', 'paper']);
export type OutfitBackgroundStyle = z.infer<typeof OutfitBackgroundStyleSchema>;

export const OutfitItemInputSchema = z.object({
  wardrobeItemId: z.string(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().min(0.2).max(3),
  rotation: z.number().min(-360).max(360),
  zIndex: z.number().int().min(0).max(999),
  mirror: z.boolean().default(false),
  labelText: z.string().max(64).nullish(),
  labelVisible: z.boolean().default(false),
});
export type OutfitItemInput = z.infer<typeof OutfitItemInputSchema>;

export const CreateOutfitInputSchema = z.object({
  name: z.string().trim().min(1).max(80).nullish(),
  backgroundStyle: OutfitBackgroundStyleSchema.default('solid'),
  items: z.array(OutfitItemInputSchema).min(1).max(40),
});
export type CreateOutfitInput = z.infer<typeof CreateOutfitInputSchema>;

export const UpdateOutfitInputSchema = z.object({
  name: z.string().trim().min(1).max(80).nullish(),
  backgroundStyle: OutfitBackgroundStyleSchema.optional(),
  items: z.array(OutfitItemInputSchema).min(1).max(40).optional(),
});
export type UpdateOutfitInput = z.infer<typeof UpdateOutfitInputSchema>;

export const OutfitItemSchema = OutfitItemInputSchema.extend({
  id: z.string().uuid(),
  outfitId: z.string().uuid(),
  sourceType: BuilderWardrobeItemSourceSchema,
  sourceRefId: z.string().nullable(),
  imageOriginalUrl: z.string().url(),
  imageCutoutUrl: z.string().url(),
  category: z.string().nullable(),
  colors: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OutfitItem = z.infer<typeof OutfitItemSchema>;

export const CreatedOutfitSchema = z.object({
  id: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  name: z.string().nullable(),
  coverImageUrl: z.string().url().nullable(),
  backgroundStyle: OutfitBackgroundStyleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  itemCount: z.number().int().nonnegative().optional(),
  items: z.array(OutfitItemSchema).optional(),
});
export type CreatedOutfit = z.infer<typeof CreatedOutfitSchema>;

export const ListCreatedOutfitsResponseSchema = z.object({
  outfits: z.array(CreatedOutfitSchema),
});
export type ListCreatedOutfitsResponse = z.infer<typeof ListCreatedOutfitsResponseSchema>;

export const GetBuilderWardrobeResponseSchema = z.object({
  items: z.array(BuilderWardrobeItemSchema),
});
export type GetBuilderWardrobeResponse = z.infer<typeof GetBuilderWardrobeResponseSchema>;

export const RenderOutfitResponseSchema = z.object({
  outfit: CreatedOutfitSchema,
});
export type RenderOutfitResponse = z.infer<typeof RenderOutfitResponseSchema>;
