-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('pending', 'uploaded', 'processing', 'ready', 'failed');

-- CreateTable
CREATE TABLE "media_uploads" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'pending',
    "original_url" TEXT,
    "processed_url" TEXT,
    "thumbnail_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_garments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "media_upload_id" UUID NOT NULL,
    "category" TEXT,
    "colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dominant_hex" TEXT,
    "confidence" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_garments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_posts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "media_upload_id" UUID,
    "image_url" TEXT NOT NULL,
    "processed_url" TEXT,
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_post_tags" (
    "post_id" UUID NOT NULL,
    "garment_id" UUID NOT NULL,

    CONSTRAINT "user_post_tags_pkey" PRIMARY KEY ("post_id","garment_id")
);

-- CreateIndex
CREATE INDEX "media_uploads_user_id_idx" ON "media_uploads"("user_id");

-- CreateIndex
CREATE INDEX "media_uploads_status_idx" ON "media_uploads"("status");

-- CreateIndex
CREATE INDEX "user_garments_user_id_idx" ON "user_garments"("user_id");

-- CreateIndex
CREATE INDEX "user_garments_category_idx" ON "user_garments"("category");

-- CreateIndex
CREATE INDEX "user_posts_user_id_idx" ON "user_posts"("user_id");

-- CreateIndex
CREATE INDEX "user_posts_created_at_idx" ON "user_posts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "user_post_tags_garment_id_idx" ON "user_post_tags"("garment_id");

-- AddForeignKey
ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_garments" ADD CONSTRAINT "user_garments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_garments" ADD CONSTRAINT "user_garments_media_upload_id_fkey" FOREIGN KEY ("media_upload_id") REFERENCES "media_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_posts" ADD CONSTRAINT "user_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_posts" ADD CONSTRAINT "user_posts_media_upload_id_fkey" FOREIGN KEY ("media_upload_id") REFERENCES "media_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_post_tags" ADD CONSTRAINT "user_post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "user_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_post_tags" ADD CONSTRAINT "user_post_tags_garment_id_fkey" FOREIGN KEY ("garment_id") REFERENCES "user_garments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
