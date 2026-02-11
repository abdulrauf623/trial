import { z } from 'zod';

export const MediaStatusSchema = z.enum(['pending', 'uploaded', 'processing', 'ready', 'failed']);
export type MediaStatus = z.infer<typeof MediaStatusSchema>;

export const PresignedUploadRequestSchema = z.object({
  contentType: z.string(),
  type: z.enum(['garment', 'post']),
});
export type PresignedUploadRequest = z.infer<typeof PresignedUploadRequestSchema>;

export const PresignedUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  mediaId: z.string().uuid(),
  publicUrl: z.string().url(),
});
export type PresignedUploadResponse = z.infer<typeof PresignedUploadResponseSchema>;

export const MarkUploadCompleteSchema = z.object({
  publicUrl: z.string().url(),
});
export type MarkUploadComplete = z.infer<typeof MarkUploadCompleteSchema>;

export const MediaStatusResponseSchema = z.object({
  id: z.string().uuid(),
  status: MediaStatusSchema,
  originalUrl: z.string().url().nullable(),
  processedUrl: z.string().url().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  metadata: z.any(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MediaStatusResponse = z.infer<typeof MediaStatusResponseSchema>;
