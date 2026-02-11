import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  get databaseUrl(): string {
    return process.env.DATABASE_URL || '';
  }

  get jwtSecret(): string {
    return process.env.JWT_SECRET || 'default-secret';
  }

  get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || '7d';
  }

  get jwtRefreshExpiresIn(): string {
    return process.env.JWT_REFRESH_EXPIRES_IN || '30d';
  }

  get port(): number {
    return parseInt(process.env.PORT || '3000', 10);
  }

  // S3 Storage
  get s3Endpoint(): string {
    return process.env.S3_ENDPOINT || 'http://localhost:9000';
  }

  get s3AccessKey(): string {
    return process.env.S3_ACCESS_KEY || 'minioadmin';
  }

  get s3SecretKey(): string {
    return process.env.S3_SECRET_KEY || 'minioadmin';
  }

  get s3Bucket(): string {
    return process.env.S3_BUCKET || 'fashion-app';
  }

  get s3Region(): string {
    return process.env.S3_REGION || 'us-east-1';
  }

  get s3ForcePathStyle(): boolean {
    // MinIO requires path-style, AWS S3 uses virtual-hosted-style
    return process.env.S3_FORCE_PATH_STYLE === 'true' || this.s3Endpoint.includes('localhost');
  }

  get s3PublicRead(): boolean {
    if (process.env.S3_PUBLIC_READ !== undefined) {
      return process.env.S3_PUBLIC_READ === 'true';
    }

    // Default to public-read in local/dev-style object storage setups.
    return (
      this.s3Endpoint.includes('localhost') ||
      this.s3Endpoint.includes('127.0.0.1') ||
      this.s3Endpoint.includes('192.168.') ||
      this.s3Endpoint.includes('10.') ||
      this.s3Endpoint.includes('172.')
    );
  }

  // OpenAI for embeddings
  get openaiApiKey(): string {
    return process.env.OPENAI_API_KEY || '';
  }

  // Replicate for background removal (alternative)
  get replicateApiToken(): string {
    return process.env.REPLICATE_API_TOKEN || '';
  }
}
