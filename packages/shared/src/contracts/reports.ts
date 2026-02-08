import { z } from 'zod';

export const ReportReasonSchema = z.enum([
  'spam',
  'inappropriate_content',
  'harassment',
  'fake_account',
  'intellectual_property',
  'other',
]);

export type ReportReason = z.infer<typeof ReportReasonSchema>;

export const CreateReportInputSchema = z.object({
  targetType: z.enum(['post', 'user']),
  targetId: z.string().uuid(),
  reason: ReportReasonSchema,
  description: z.string().optional(),
});

export type CreateReportInput = z.infer<typeof CreateReportInputSchema>;
