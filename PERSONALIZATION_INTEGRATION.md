# Personalization MVP Integration Notes

## Stack Assumptions
- Mobile: React Native (Expo)
- API: NestJS (Node)
- Database: Postgres + Prisma
- Shared contracts: `packages/shared`

## Added Backend Modules
- `apps/api/src/style-profile`
  - `GET /style-profile`
  - `POST /style-profile`
- `apps/api/src/outfits`
  - `POST /outfits/generate`
  - Rule engine in `outfit-engine.ts`
- `apps/api/src/explore`
  - `GET /explore/feed?cursor=...&limit=...`
  - Personalized ranking + cold-start fallback

## Data Model Changes
- Prisma schema: `apps/api/src/prisma/schema.prisma`
  - Added/updated models:
    - `StyleProfile`
    - `Outfit`
    - `ExplorePost`
    - `User.wardrobePublic`
    - Extended `UserGarment` metadata fields
- Migration:
  - `apps/api/src/prisma/migrations/20260210_personalization_engine/migration.sql`

## Shared Contract Changes
- Added:
  - `packages/shared/src/contracts/style-profile.ts`
  - `packages/shared/src/contracts/outfit.ts`
  - `packages/shared/src/contracts/explore-post.ts`
- Updated:
  - `packages/shared/src/contracts/user-garments.ts`
  - `packages/shared/src/index.ts` exports

## Mobile Integration
- Onboarding screen:
  - `apps/mobile/src/screens/StyleOnboardingScreen.tsx`
  - 14-step state-machine flow
  - First-time flow + skip support + edit mode
- Navigation:
  - `apps/mobile/src/navigation/RootNavigator.tsx`
  - First login checks style profile and routes to onboarding if needed
  - Added `Onboarding` route in `apps/mobile/src/navigation/types.ts`
- API client:
  - `apps/mobile/src/services/api.ts`
  - Added:
    - `getStyleProfile`
    - `saveStyleProfile`
    - `generateOutfits`
    - `getExploreFeed`
- Explore tab:
  - `apps/mobile/src/screens/tabs/ExploreScreen.tsx`
  - Uses `/explore/feed` with fallback to legacy `/feed`
- Profile tab:
  - `apps/mobile/src/screens/tabs/ProfileScreen.tsx`
  - Added `Edit Style Profile` entry
- Wardrobe tab:
  - `apps/mobile/src/screens/tabs/WardrobeScreen.tsx`
  - Added `Generate Outfit Ideas` CTA
- Outfit recommendations screen:
  - `apps/mobile/src/screens/OutfitBuilderScreen.tsx`
  - Calls `/outfits/generate`, renders ranked outfits + reasons
- Manual garment tagging (MVP):
  - `apps/mobile/src/screens/GarmentConfirmationScreen.tsx`
  - Added metadata capture for `subcategory`, `colors`, `patternType`, `textureTags`, `formalityScore`, `seasonTags`, `silhouetteTag`

## Rule Engine Behavior
- File: `apps/api/src/outfits/outfit-engine.ts`
- Core exports:
  - `generateCandidateOutfits`
  - `scoreOutfit`
  - `explainOutfit`
- Covered rule groups:
  - Required slots: top + bottom + shoes
  - Color constraints and risk-level behavior
  - Pattern comfort limits
  - Climate-based layering
  - Texture depth checks
  - Dress-code/formality constraints
  - Silhouette balancing
  - Comfort-constraint penalties
  - Seasonal relevance

## Unit Tests
- File: `apps/api/src/outfits/outfit-engine.test.ts`
- Script:
  - `pnpm --filter @fashion/api test:outfits`
- Covers:
  - Avoided-color penalty
  - Pattern comfort penalty
  - Cold-weather layering boost
  - Candidate generation + explanations

## Runbook
1. Start infra:
   - `pnpm infra:up`
2. Apply schema changes:
   - `pnpm db:push`
3. (Optional) Seed data:
   - `pnpm db:seed`
4. Start API:
   - `pnpm api`
5. Start mobile:
   - `pnpm mobile`
6. Verify:
   - First login shows onboarding (unless skipped)
   - Explore feed hits `/explore/feed`
   - Wardrobe `Generate Outfit Ideas` returns ranked recommendations

## Troubleshooting
- If `@prisma/client` runtime errors appear, regenerate client:
  - `pnpm --filter @fashion/api prisma:generate`
- If onboarding appears unexpectedly after skip:
  - Clear secure storage on device/simulator and re-login.
