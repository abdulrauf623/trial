export type ResolvedThemeName = 'light' | 'dark';

export interface AppTheme {
  mode: ResolvedThemeName;
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    surfaceMuted: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    tint: string;
    tintMuted: string;
    icon: string;
    divider: string;
    overlay: string;
    success: string;
    danger: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
}

export const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    background: '#fafaf9',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    surfaceMuted: '#f3f4f6',
    textPrimary: '#101828',
    textSecondary: '#475467',
    textTertiary: '#667085',
    border: '#e5e7eb',
    tint: '#111827',
    tintMuted: '#1f2937',
    icon: '#111827',
    divider: '#e5e7eb',
    overlay: 'rgba(0, 0, 0, 0.35)',
    success: '#15803d',
    danger: '#dc2626',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    pill: 999,
  },
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  colors: {
    background: '#09090b',
    surface: '#111317',
    surfaceElevated: '#161a22',
    surfaceMuted: '#1f2937',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',
    border: '#334155',
    tint: '#e2e8f0',
    tintMuted: '#cbd5e1',
    icon: '#e2e8f0',
    divider: '#334155',
    overlay: 'rgba(0, 0, 0, 0.65)',
    success: '#4ade80',
    danger: '#f87171',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    pill: 999,
  },
};
