import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface PresignedUploadResponse {
  uploadUrl: string;
  mediaId: string;
  publicUrl: string;
}

export interface MediaStatus {
  id: string;
  status: 'pending' | 'uploaded' | 'processing' | 'ready' | 'failed';
  originalUrl: string | null;
  processedUrl: string | null;
  thumbnailUrl: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private queueService: QueueService
  ) {}

  /**
   * Generate presigned URL for direct upload
   */
  async createPresignedUpload(
    userId: string,
    contentType: string,
    type: 'garment' | 'post'
  ): Promise<PresignedUploadResponse> {
    // Validate content type
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `Invalid content type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    // Create media upload record
    const media = await this.prisma.mediaUpload.create({
      data: {
        userId,
        status: 'pending',
      },
    });

    console.log(`[Uploads] Created media upload ${media.id} for user ${userId}`);

    // Generate presigned URL
    const { uploadUrl, publicUrl } = await this.storageService.generatePresignedUpload(
      userId,
      media.id,
      contentType,
      type
    );

    console.log(`[Uploads] Generated presigned URL for ${media.id}`);

    return {
      uploadUrl,
      mediaId: media.id,
      publicUrl,
    };
  }

  /**
   * Mark upload as complete and enqueue processing
   */
  async markUploadComplete(userId: string, mediaId: string, publicUrl: string): Promise<void> {
    // Verify ownership
    const media = await this.prisma.mediaUpload.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media upload not found');
    }

    if (media.userId !== userId) {
      throw new BadRequestException('Not authorized to update this media');
    }

    if (media.status !== 'pending') {
      throw new BadRequestException('Media upload already processed');
    }

    // Update status to uploaded
    await this.prisma.mediaUpload.update({
      where: { id: mediaId },
      data: {
        status: 'uploaded',
        originalUrl: publicUrl,
      },
    });

    console.log(`[Uploads] Marked media ${mediaId} as uploaded`);

    // Enqueue processing job
    await this.queueService.enqueueGarmentProcessing(mediaId);

    console.log(`[Uploads] Enqueued processing for ${mediaId}`);
  }

  /**
   * Get media upload status
   */
  async getMediaStatus(userId: string, mediaId: string): Promise<MediaStatus> {
    const media = await this.prisma.mediaUpload.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media upload not found');
    }

    // Allow viewing if user owns it
    if (media.userId !== userId) {
      throw new BadRequestException('Not authorized to view this media');
    }

    return {
      id: media.id,
      status: media.status,
      originalUrl: media.originalUrl,
      processedUrl: media.processedUrl,
      thumbnailUrl: media.thumbnailUrl,
      metadata: media.metadata || {},
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    };
  }
}
