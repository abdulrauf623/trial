-- Add wardrobe visibility to users
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "wardrobe_public" BOOLEAN NOT NULL DEFAULT true;

-- Enrich user garments for manual metadata tagging + outfit rules
ALTER TABLE "user_garments"
ADD COLUMN IF NOT EXISTS "subcategory" TEXT,
ADD COLUMN IF NOT EXISTS "pattern_type" TEXT,
ADD COLUMN IF NOT EXISTS "texture_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "formality_score" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS "season_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "removed_bg_url" TEXT,
ADD COLUMN IF NOT EXISTS "silhouette_tag" TEXT;

-- Style profile (one row per user)
CREATE TABLE IF NOT EXISTS "style_profiles" (
  "user_id" UUID NOT NULL,
  "contexts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "dress_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "climate" TEXT NOT NULL,
  "rainy" BOOLEAN NOT NULL DEFAULT false,
  "fit_preference" TEXT NOT NULL,
  "archetypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "risk_level" TEXT NOT NULL,
  "preferred_neutrals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "liked_colors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "avoided_colors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "pattern_comfort" TEXT NOT NULL,
  "shoes_preference" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "accessories_level" TEXT NOT NULL,
  "comfort_constraints" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "shopping_interest" TEXT NOT NULL,
  "budget_band" TEXT NOT NULL,
  "height_range" TEXT,
  "proportions" TEXT,
  "shoulder_width" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "style_profiles_pkey" PRIMARY KEY ("user_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'style_profiles_user_id_fkey'
  ) THEN
    ALTER TABLE "style_profiles"
    ADD CONSTRAINT "style_profiles_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Persisted outfit recommendations
CREATE TABLE IF NOT EXISTS "outfits" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "garment_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "occasion_tag" TEXT NOT NULL,
  "season_tag" TEXT NOT NULL,
  "formality_score" INTEGER NOT NULL,
  "color_palette" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "silhouette_tag" TEXT NOT NULL,
  "explanations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outfits_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outfits_user_id_fkey'
  ) THEN
    ALTER TABLE "outfits"
    ADD CONSTRAINT "outfits_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "outfits_user_id_created_at_idx"
ON "outfits"("user_id", "created_at" DESC);

-- Explore posts with tag metadata for personalization ranking
CREATE TABLE IF NOT EXISTS "explore_posts" (
  "id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "image_url" TEXT NOT NULL,
  "tagged_garments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "archetypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "colors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "pattern_level" TEXT NOT NULL,
  "dress_code" TEXT NOT NULL,
  "season" TEXT NOT NULL,
  "vibe_keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "context_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "explore_posts_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'explore_posts_author_id_fkey'
  ) THEN
    ALTER TABLE "explore_posts"
    ADD CONSTRAINT "explore_posts_author_id_fkey"
      FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "explore_posts_author_id_idx"
ON "explore_posts"("author_id");

CREATE INDEX IF NOT EXISTS "explore_posts_created_at_idx"
ON "explore_posts"("created_at" DESC);
