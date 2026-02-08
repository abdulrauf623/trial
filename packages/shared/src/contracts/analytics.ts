import { z } from 'zod';

export const TrackEventInputSchema = z.object({
  eventName: z.string(),
  properties: z.record(z.any()).optional(),
});

export type TrackEventInput = z.infer<typeof TrackEventInputSchema>;
