import { z } from 'zod';

export const ContextOptionSchema = z.enum([
  'Work',
  'School',
  'Dates',
  'Night out',
  'Weekend casual',
  'Travel',
  'Events',
]);

export const DressCodeOptionSchema = z.enum([
  'Formal',
  'Business casual',
  'Smart casual',
  'Casual',
  'Streetwear',
]);

export const ClimateOptionSchema = z.enum(['Hot', 'Mild', 'Cold', 'Mixed']);
export const FitPreferenceOptionSchema = z.enum(['Slim', 'Regular', 'Relaxed', 'Oversized']);
export const RiskLevelOptionSchema = z.enum(['Safe', 'Balanced', 'Experimental']);
export const PatternComfortOptionSchema = z.enum(['Solids only', 'Some patterns', 'Bold patterns']);
export const AccessoriesLevelOptionSchema = z.enum(['None', 'Minimal', 'Statement']);

export const StyleArchetypeOptionSchema = z.enum([
  'Minimal',
  'Classic',
  'Streetwear',
  'Preppy',
  'Avant-garde',
  'Gorpcore',
  'Tailored',
  'Vintage',
]);

export const NeutralColorOptionSchema = z.enum(['Black', 'Navy', 'Grey', 'Beige', 'White', 'Olive']);
export const ShoesPreferenceOptionSchema = z.enum(['Sneakers', 'Boots', 'Loafers', 'Heels', 'Sandals']);

export const StyleProfileInputSchema = z.object({
  contexts: z.array(ContextOptionSchema).max(3),
  dressCodes: z.array(DressCodeOptionSchema).min(1),
  climate: ClimateOptionSchema,
  rainy: z.boolean().default(false),
  fitPreference: FitPreferenceOptionSchema,
  archetypes: z.array(StyleArchetypeOptionSchema).min(1).max(3),
  riskLevel: RiskLevelOptionSchema,
  preferredNeutrals: z.array(NeutralColorOptionSchema),
  likedColors: z.array(z.string()).max(20),
  avoidedColors: z.array(z.string()).max(20),
  patternComfort: PatternComfortOptionSchema,
  shoesPreference: z.array(ShoesPreferenceOptionSchema),
  accessoriesLevel: AccessoriesLevelOptionSchema,
  comfortConstraints: z.array(z.string()).max(20),
  shoppingInterest: z.string().default('balanced'),
  budgetBand: z.string().default('mid'),
  heightRange: z.string().nullish(),
  proportions: z.string().nullish(),
  shoulderWidth: z.string().nullish(),
});
export type StyleProfileInput = z.infer<typeof StyleProfileInputSchema>;

export const StyleProfileSchema = StyleProfileInputSchema.extend({
  userId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StyleProfile = z.infer<typeof StyleProfileSchema>;

export const StyleProfileResponseSchema = z.object({
  profile: StyleProfileSchema.nullable(),
});
export type StyleProfileResponse = z.infer<typeof StyleProfileResponseSchema>;
