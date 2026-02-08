import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(2).max(100),
  accountType: z.enum(['creator', 'user']),
  stylePreferences: z.array(z.string()).optional().default([]),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string(),
    accountType: z.enum(['creator', 'user']),
    avatarUrl: z.string().nullable(),
    isPremium: z.boolean(),
    createdAt: z.string(),
  }),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export const MeResponseSchema = AuthResponseSchema.shape.user;

export type MeResponse = z.infer<typeof MeResponseSchema>;
