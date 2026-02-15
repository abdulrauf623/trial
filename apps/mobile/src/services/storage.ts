import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ONBOARDING_SKIP_PREFIX = 'style_onboarding_skipped_';
const THEME_PREFERENCE_KEY = 'theme_preference';
const OUTFIT_DRAFT_PREFIX = 'outfit_builder_draft_';

export type ThemePreference = 'system' | 'light' | 'dark';

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

function onboardingSkipKey(userId: string): string {
  return `${ONBOARDING_SKIP_PREFIX}${userId}`;
}

export async function setOnboardingSkipped(userId: string, skipped: boolean): Promise<void> {
  const key = onboardingSkipKey(userId);
  if (skipped) {
    await SecureStore.setItemAsync(key, '1');
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getOnboardingSkipped(userId: string): Promise<boolean> {
  const value = await SecureStore.getItemAsync(onboardingSkipKey(userId));
  return value === '1';
}

export async function setThemePreference(preference: ThemePreference): Promise<void> {
  await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, preference);
}

export async function getThemePreference(): Promise<ThemePreference> {
  const value = await SecureStore.getItemAsync(THEME_PREFERENCE_KEY);
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
}

function outfitDraftKey(userId: string): string {
  return `${OUTFIT_DRAFT_PREFIX}${userId}`;
}

export async function setOutfitDraft(userId: string, payload: string): Promise<void> {
  await SecureStore.setItemAsync(outfitDraftKey(userId), payload);
}

export async function getOutfitDraft(userId: string): Promise<string | null> {
  return SecureStore.getItemAsync(outfitDraftKey(userId));
}

export async function clearOutfitDraft(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(outfitDraftKey(userId));
}
