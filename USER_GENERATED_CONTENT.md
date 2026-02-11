# User-Generated Content Implementation

## Overview

This feature enables users to:
1. **Upload their own clothing photos** to their wardrobe
2. **Create posts** with their photos and tag their wardrobe items
3. **Automated processing** of images (resize, background removal, color extraction, category detection)

## Architecture

### Components

1. **Storage Service** (`apps/api/src/storage/`)
   - S3-compatible object storage (MinIO for local, AWS S3 for production)
   - Presigned URL generation for direct client uploads
   - File management and URL generation

2. **Processing Service** (`apps/api/src/processing/`)
   - Image validation and resizing (max 2048px)
   - Background removal (simplified stub - integrate Replicate in production)
   - Dominant color extraction using Sharp
   - Category detection (rule-based stub - integrate OpenAI Vision in production)
   - Thumbnail generation (400px)

3. **Queue Service** (`apps/api/src/queue/`)
   - Async job processing for image uploads
   - Retry logic with exponential backoff
   - Job types: `process_garment_image`, `generate_post_embedding`, `generate_item_embedding`

4. **Uploads Module** (`apps/api/src/uploads/`)
   - Presigned URL generation: `POST /uploads/presign`
   - Upload completion: `PATCH /uploads/:mediaId/complete`
   - Status polling: `GET /uploads/:mediaId/status`

5. **User Garments Module** (`apps/api/src/user-garments/`)
   - Create garment: `POST /user-garments`
   - List garments: `GET /user-garments?category=tshirt&limit=50`
   - Get garment: `GET /user-garments/:garmentId`
   - Update garment: `PATCH /user-garments/:garmentId`
   - Delete garment: `DELETE /user-garments/:garmentId`

6. **User Posts Module** (`apps/api/src/user-posts/`)
   - Create post: `POST /user-posts`
   - List posts: `GET /user-posts?userId=xxx&limit=20&cursor=xxx`
   - Get post: `GET /user-posts/:postId`
   - Delete post: `DELETE /user-posts/:postId`

## Database Schema

### MediaUpload
```prisma
model MediaUpload {
  id           String      @id @default(uuid())
  userId       String
  status       MediaStatus @default(pending) // pending | uploaded | processing | ready | failed
  originalUrl  String?
  processedUrl String?
  thumbnailUrl String?
  metadata     Json?       // Processing results, errors
  createdAt    DateTime
  updatedAt    DateTime
}
```

### UserGarment
```prisma
model UserGarment {
  id            String   @id @default(uuid())
  userId        String
  mediaUploadId String
  category      String?  // Auto-detected or user-specified
  colors        String[] // Extracted color palette
  dominantHex   String?  // Primary color
  confidence    Float?   // Category detection confidence
  notes         String?
  createdAt     DateTime
  updatedAt     DateTime
}
```

### UserPost
```prisma
model UserPost {
  id            String   @id @default(uuid())
  userId        String
  mediaUploadId String?
  imageUrl      String
  processedUrl  String?
  caption       String?
  taggedGarments UserPostTag[]
  createdAt     DateTime
  updatedAt     DateTime
}
```

## Upload Flow

### 1. Client Request Presigned URL
```typescript
POST /uploads/presign
{
  "contentType": "image/jpeg",
  "type": "garment" | "post"
}

Response:
{
  "uploadUrl": "https://s3.../presigned-url",
  "mediaId": "uuid",
  "publicUrl": "https://s3.../public-url"
}
```

### 2. Client Uploads to S3
```typescript
PUT uploadUrl
Body: <image file>
Headers:
  Content-Type: image/jpeg
```

### 3. Client Marks Upload Complete
```typescript
PATCH /uploads/:mediaId/complete
{
  "publicUrl": "https://s3.../public-url"
}

Response:
{
  "success": true
}
```
- Backend enqueues processing job
- Status changes: pending → uploaded → processing

### 4. Worker Processes Image (Async)
- Downloads original from S3
- Validates and auto-orients
- Resizes to max 2048px
- Removes background (stub - integrate Replicate)
- Extracts dominant colors
- Detects category (stub - integrate OpenAI Vision)
- Creates thumbnail (400px)
- Uploads processed variants to S3
- Updates MediaUpload status: processing → ready | failed

### 5. Client Polls Status
```typescript
GET /uploads/:mediaId/status

Response:
{
  "id": "uuid",
  "status": "ready",
  "originalUrl": "...",
  "processedUrl": "...",
  "thumbnailUrl": "...",
  "metadata": {
    "dominantColors": ["#FF5733", "#33FF57"],
    "dominantHex": "#FF5733",
    "detectedCategory": "tshirt",
    "confidence": 0.85
  },
  "createdAt": "2024-...",
  "updatedAt": "2024-..."
}
```

### 6. Client Creates Garment or Post
```typescript
// Create Garment
POST /user-garments
{
  "mediaUploadId": "uuid",
  "notes": "My favorite jacket"
}

// Create Post
POST /user-posts
{
  "imageUrl": "https://s3.../original.jpg",
  "mediaUploadId": "uuid",
  "caption": "Check out my outfit!",
  "taggedGarmentIds": ["uuid1", "uuid2"]
}
```

## Local Development Setup

### Prerequisites
- PostgreSQL 14+ running on port 5433
- MinIO or S3-compatible storage

### 1. Start MinIO (Local S3)
```bash
# Using Docker
docker run -p 9000:9000 -p 9001:9001 \\
  -e MINIO_ROOT_USER=minioadmin \\
  -e MINIO_ROOT_PASSWORD=minioadmin \\
  minio/minio server /data --console-address ":9001"

# Access MinIO Console: http://localhost:9001
# Create bucket: fashion-app
```

### 2. Configure Environment
```bash
cp .env.example .env

# Update .env with:
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/fashion_db
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=fashion-app
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

# Optional for production features:
OPENAI_API_KEY=your-key-here
REPLICATE_API_TOKEN=your-token-here
```

### 3. Run Migrations
```bash
cd apps/api
pnpm prisma db push
pnpm prisma generate
```

### 4. Start Backend
```bash
pnpm api
# Server runs on http://localhost:3000
```

### 5. Test Upload Flow
```bash
# 1. Get presigned URL
curl -X POST http://localhost:3000/uploads/presign \\
  -H "Authorization: Bearer YOUR_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"contentType": "image/jpeg", "type": "garment"}'

# 2. Upload to presigned URL
curl -X PUT "PRESIGNED_URL" \\
  -H "Content-Type: image/jpeg" \\
  --data-binary "@photo.jpg"

# 3. Mark complete
curl -X PATCH http://localhost:3000/uploads/MEDIA_ID/complete \\
  -H "Authorization: Bearer YOUR_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"publicUrl": "PUBLIC_URL"}'

# 4. Poll status
curl http://localhost:3000/uploads/MEDIA_ID/status \\
  -H "Authorization: Bearer YOUR_JWT"

# 5. Create garment
curl -X POST http://localhost:3000/user-garments \\
  -H "Authorization: Bearer YOUR_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"mediaUploadId": "MEDIA_ID", "notes": "My jacket"}'
```

## Production Enhancements

### 1. Background Removal
Replace stub in `processing.service.ts`:

```typescript
private async removeBackground(image: sharp.Sharp): Promise<Buffer> {
  // Current: Just converts to PNG

  // Production: Use Replicate API
  const tempFile = await this.saveTempFile(await image.toBuffer());

  const prediction = await replicate.run(
    "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
    { input: { image: tempFile } }
  );

  return this.downloadImage(prediction.output);
}
```

### 2. Category Detection
Replace stub in `processing.service.ts`:

```typescript
private async detectCategory(
  buffer: Buffer,
  metadata: sharp.Metadata
): Promise<{ category: string; confidence: number }> {
  // Current: Rule-based heuristics

  // Production: Use OpenAI Vision API
  const base64 = buffer.toString('base64');

  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Classify this clothing item into one of: tshirt, shirt, hoodie, sweater, jacket, coat, pants, jeans, shorts, sneakers, shoes, boots, hat, bag, dress, skirt, other. Respond with JSON: {category: string, confidence: number}" },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } }
      ]
    }],
    max_tokens: 100
  });

  const result = JSON.parse(response.choices[0].message.content);
  return { category: result.category, confidence: result.confidence };
}
```

### 3. Queue System
For production, replace in-memory queue with BullMQ + Redis:

```typescript
// queue.module.ts
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'media-processing',
    }),
  ],
})

// queue.service.ts
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

async enqueueGarmentProcessing(mediaId: string) {
  await this.queue.add('process-garment', { mediaId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  });
}
```

## Security Considerations

1. **Access Control**
   - All endpoints require JWT authentication
   - Users can only upload/view their own content
   - Presigned URLs expire in 1 hour

2. **File Validation**
   - Only allow image/* MIME types (jpeg, png, webp)
   - Validate file size (max 10MB)
   - Validate image dimensions

3. **Storage Security**
   - Use signed URLs for private content
   - Implement bucket policies to prevent unauthorized access
   - Enable versioning for backup/recovery

4. **Rate Limiting**
   - Already implemented via @nestjs/throttler (100 req/min)
   - Consider per-user upload limits

## Next Steps

1. **Mobile Integration** - Create React Native screens for upload and gallery
2. **Production Setup** - Configure AWS S3, OpenAI, and Replicate
3. **Testing** - Add unit and integration tests
4. **Monitoring** - Add logging and metrics for processing jobs
5. **Optimization** - Implement CDN for image delivery

## Troubleshooting

### TypeScript Errors (Prisma Client)
```bash
# Regenerate Prisma Client
cd apps/api
pnpm prisma generate

# If issues persist, clear node_modules
rm -rf node_modules package-lock.json
pnpm install
```

### MinIO Connection Issues
```bash
# Check MinIO is running
curl http://localhost:9000/minio/health/live

# Create bucket manually
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/fashion-app
```

### Processing Jobs Not Running
```bash
# Check queue logs
# Jobs process every 5 seconds
# Check for errors in server logs
```
