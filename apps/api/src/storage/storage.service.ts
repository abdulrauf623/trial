import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private s3Client: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.s3Bucket;
    this.s3Client = new S3Client({
      endpoint: this.config.s3Endpoint,
      region: this.config.s3Region,
      credentials: {
        accessKeyId: this.config.s3AccessKey,
        secretAccessKey: this.config.s3SecretKey,
      },
      forcePathStyle: this.config.s3ForcePathStyle,
    });
  }

  async onModuleInit() {
    console.log('[Storage] S3 client initialized');
    console.log('[Storage] Bucket:', this.bucket);
    console.log('[Storage] Endpoint:', this.config.s3Endpoint);
    await this.ensureBucketReady();
  }

  /**
   * Generate a presigned URL for direct upload
   */
  async generatePresignedUpload(
    userId: string,
    mediaId: string,
    contentType: string,
    type: 'garment' | 'post' | 'outfit'
  ): Promise<PresignedUpload> {
    const key = this.generateKey(userId, mediaId, type, 'original');

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    const publicUrl = this.getPublicUrl(key);

    return {
      uploadUrl,
      key,
      publicUrl,
    };
  }

  /**
   * Upload a buffer directly (for processed images)
   */
  async uploadBuffer(
    userId: string,
    mediaId: string,
    buffer: Buffer,
    contentType: string,
    variant: 'original' | 'processed' | 'thumbnail',
    type: 'garment' | 'post' | 'outfit'
  ): Promise<string> {
    const key = this.generateKey(userId, mediaId, type, variant);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);

    return this.getPublicUrl(key);
  }

  /**
   * Download a file from S3
   */
  async downloadFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const chunks: Uint8Array[] = [];

    if (response.Body) {
      // @ts-ignore - Body is a ReadableStream
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
    }

    return Buffer.concat(chunks);
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Generate a consistent key pattern
   */
  private generateKey(
    userId: string,
    mediaId: string,
    type: 'garment' | 'post' | 'outfit',
    variant: 'original' | 'processed' | 'thumbnail'
  ): string {
    const extension = variant === 'processed' ? 'png' : 'jpg';
    return `user/${userId}/${type}/${mediaId}/${variant}.${extension}`;
  }

  /**
   * Get public URL for a key
   */
  private getPublicUrl(key: string): string {
    const endpoint = this.config.s3Endpoint;
    const bucket = this.bucket;

    if (this.config.s3ForcePathStyle) {
      // MinIO/local: http://localhost:9000/bucket/key
      return `${endpoint}/${bucket}/${key}`;
    } else {
      // AWS S3: https://bucket.s3.region.amazonaws.com/key
      return `https://${bucket}.s3.${this.config.s3Region}.amazonaws.com/${key}`;
    }
  }

  private async ensureBucketReady(): Promise<void> {
    try {
      await this.s3Client.send(
        new HeadBucketCommand({
          Bucket: this.bucket,
        })
      );
      console.log(`[Storage] Bucket "${this.bucket}" exists`);
    } catch {
      await this.s3Client.send(
        new CreateBucketCommand({
          Bucket: this.bucket,
        })
      );
      console.log(`[Storage] Created bucket "${this.bucket}"`);
    }

    if (!this.config.s3PublicRead) {
      return;
    }

    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    };

    try {
      await this.s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify(policy),
        })
      );
      console.log(`[Storage] Applied public-read policy for bucket "${this.bucket}"`);
    } catch (error) {
      console.warn(`[Storage] Failed to apply public-read policy for "${this.bucket}":`, error);
    }
  }

  /**
   * Extract key from public URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);

      if (this.config.s3ForcePathStyle) {
        // Remove bucket name from path
        return pathParts.slice(1).join('/');
      } else {
        // Already just the key
        return pathParts.join('/');
      }
    } catch {
      return null;
    }
  }
}
