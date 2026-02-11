import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  Theme as NavigationTheme,
} from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { getThemePreference, setThemePreference, ThemePreference } from '../services/storage';
import { AppTheme, darkTheme, lightTheme, ResolvedThemeName } from './tokens';

interface ThemeContextValue {
  theme: AppTheme;
  navigationTheme: NavigationTheme;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => Promise<void>;
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveThemeName(preference: ThemePreference, systemScheme: ReturnType<typeof useColorScheme>): ResolvedThemeName {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const savedPreference = await getThemePreference();
        if (mounted) {
          setPreferenceState(savedPreference);
        }
      } catch (error) {
        console.error('Failed to read theme preference:', error);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const resolvedMode = resolveThemeName(preference, systemScheme);
  const theme = resolvedMode === 'dark' ? darkTheme : lightTheme;

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = resolvedMode === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.tint,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.textPrimary,
        border: theme.colors.border,
        notification: theme.colors.danger,
      },
    };
  }, [resolvedMode, theme]);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    try {
      await setThemePreference(next);
    } catch (error) {
      console.error('Failed to persist theme preference:', error);
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      navigationTheme,
      isDark: resolvedMode === 'dark',
      preference,
      setPreference,
      ready,
    }),
    [theme, navigationTheme, resolvedMode, preference, setPreference, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used inside ThemeProvider');
  }
  return context;
}
