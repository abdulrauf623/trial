import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  accountType: z.enum(['creator', 'user']),
  avatarUrl: z.string().nullable(),
  stylePreferences: z.array(z.string()),
  isPremium: z.boolean(),
  premiumExpiresAt: z.string().nullable(),
  createdAt: z.string(),
});

export type User = z.infer<typeof UserSchema>;
