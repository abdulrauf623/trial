CREATE TABLE IF NOT EXISTS "created_outfits" (
  "id" UUID NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "name" TEXT,
  "cover_image_url" TEXT,
  "background_style" TEXT NOT NULL DEFAULT 'solid',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "created_outfits_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'created_outfits_owner_user_id_fkey'
  ) THEN
    ALTER TABLE "created_outfits"
    ADD CONSTRAINT "created_outfits_owner_user_id_fkey"
      FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "created_outfits_owner_user_id_created_at_idx"
ON "created_outfits"("owner_user_id", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "created_outfit_items" (
  "id" UUID NOT NULL,
  "outfit_id" UUID NOT NULL,
  "wardrobe_item_id" TEXT NOT NULL,
  "source_type" TEXT NOT NULL,
  "source_ref_id" TEXT,
  "image_original_url" TEXT NOT NULL,
  "image_cutout_url" TEXT NOT NULL,
  "category" TEXT,
  "colors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "x" DOUBLE PRECISION NOT NULL,
  "y" DOUBLE PRECISION NOT NULL,
  "scale" DOUBLE PRECISION NOT NULL,
  "rotation" DOUBLE PRECISION NOT NULL,
  "z_index" INTEGER NOT NULL DEFAULT 0,
  "mirror" BOOLEAN NOT NULL DEFAULT false,
  "label_text" TEXT,
  "label_visible" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "created_outfit_items_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'created_outfit_items_outfit_id_fkey'
  ) THEN
    ALTER TABLE "created_outfit_items"
    ADD CONSTRAINT "created_outfit_items_outfit_id_fkey"
      FOREIGN KEY ("outfit_id") REFERENCES "created_outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "created_outfit_items_outfit_id_z_index_idx"
ON "created_outfit_items"("outfit_id", "z_index");

CREATE INDEX IF NOT EXISTS "created_outfit_items_wardrobe_item_id_idx"
ON "created_outfit_items"("wardrobe_item_id");
