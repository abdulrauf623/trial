import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleProfileInput } from '@fashion/shared';
import { RootStackParamList } from '../navigation/types';
import { api } from '../services/api';
import { getOnboardingSkipped, setOnboardingSkipped } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { LineIcon } from '../components/LineIcon';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const CONTEXT_OPTIONS = ['Work', 'School', 'Dates', 'Night out', 'Weekend casual', 'Travel', 'Events'] as const;
const DRESS_CODE_OPTIONS = ['Formal', 'Business casual', 'Smart casual', 'Casual', 'Streetwear'] as const;
const CLIMATE_OPTIONS = ['Hot', 'Mild', 'Cold', 'Mixed'] as const;
const FIT_OPTIONS = ['Slim', 'Regular', 'Relaxed', 'Oversized'] as const;
const ARCHETYPE_OPTIONS = ['Minimal', 'Classic', 'Streetwear', 'Preppy', 'Avant-garde', 'Gorpcore', 'Tailored', 'Vintage'] as const;
const RISK_OPTIONS = ['Safe', 'Balanced', 'Experimental'] as const;
const NEUTRAL_OPTIONS = ['Black', 'Navy', 'Grey', 'Beige', 'White', 'Olive'] as const;
const COLOR_OPTIONS = ['Black', 'White', 'Grey', 'Navy', 'Beige', 'Olive', 'Brown', 'Red', 'Blue', 'Green', 'Pink', 'Purple', 'Yellow', 'Orange'] as const;
const PATTERN_OPTIONS = ['Solids only', 'Some patterns', 'Bold patterns'] as const;
const SHOE_OPTIONS = ['Sneakers', 'Boots', 'Loafers', 'Heels', 'Sandals'] as const;
const ACCESSORIES_OPTIONS = ['None', 'Minimal', 'Statement'] as const;
const COMFORT_OPTIONS = ['Itchy fabrics', 'Tight collars', 'Heavy layers', 'No heels', 'Hate skinny jeans', 'No wool', 'No dry-clean only'] as const;
const SHOPPING_INTEREST_OPTIONS = ['Essentials', 'Balanced', 'Trend-forward'] as const;
const BUDGET_OPTIONS = ['Low', 'Mid', 'High'] as const;

const STEP_TITLES = [
  'Primary contexts',
  'Usual dress code',
  'Climate',
  'Fit preference',
  'Style archetypes',
  'Risk level',
  'Preferred neutrals',
  'Liked colors',
  'Avoided colors',
  'Pattern comfort',
  'Shoes you wear most',
  'Accessories level',
  'Comfort constraints',
  'Optional body details',
] as const;

const DEFAULT_PROFILE: StyleProfileInput = {
  contexts: ['Weekend casual'],
  dressCodes: ['Casual'],
  climate: 'Mixed',
  rainy: false,
  fitPreference: 'Regular',
  archetypes: ['Minimal', 'Classic'],
  riskLevel: 'Balanced',
  preferredNeutrals: ['Black', 'White'],
  likedColors: [],
  avoidedColors: [],
  patternComfort: 'Some patterns',
  shoesPreference: ['Sneakers'],
  accessoriesLevel: 'Minimal',
  comfortConstraints: [],
  shoppingInterest: 'Balanced',
  budgetBand: 'Mid',
};

function toggle<T extends string>(values: T[], value: T, max?: number): T[] {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }
  if (max && values.length >= max) {
    return values;
  }
  return [...values, value];
}

function toInput(profile: NonNullable<Awaited<ReturnType<typeof api.getStyleProfile>>['profile']>): StyleProfileInput {
  return {
    contexts: profile.contexts,
    dressCodes: profile.dressCodes,
    climate: profile.climate,
    rainy: profile.rainy,
    fitPreference: profile.fitPreference,
    archetypes: profile.archetypes,
    riskLevel: profile.riskLevel,
    preferredNeutrals: profile.preferredNeutrals,
    likedColors: profile.likedColors,
    avoidedColors: profile.avoidedColors,
    patternComfort: profile.patternComfort,
    shoesPreference: profile.shoesPreference,
    accessoriesLevel: profile.accessoriesLevel,
    comfortConstraints: profile.comfortConstraints,
    shoppingInterest: profile.shoppingInterest,
    budgetBand: profile.budgetBand,
    heightRange: profile.heightRange,
    proportions: profile.proportions,
    shoulderWidth: profile.shoulderWidth,
  };
}

export function StyleOnboardingScreen({ route, navigation }: Props) {
  const mode = route.params?.mode || 'first_time';
  const { user } = useAuth();

  const [profile, setProfile] = useState<StyleProfileInput>(DEFAULT_PROFILE);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== 'edit') return;
    let mounted = true;
    (async () => {
      try {
        const response = await api.getStyleProfile();
        if (mounted && response.profile) {
          setProfile(toInput(response.profile));
        }
      } catch (error) {
        console.error('Failed to load style profile for edit', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [mode]);

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return profile.contexts.length > 0 && profile.contexts.length <= 3;
      case 1:
        return profile.dressCodes.length > 0;
      case 4:
        return profile.archetypes.length >= 2 && profile.archetypes.length <= 3;
      default:
        return true;
    }
  }, [profile, step]);

  const isLastStep = step === STEP_TITLES.length - 1;
  const progress = Math.round(((step + 1) / STEP_TITLES.length) * 100);

  const handleSkip = () => {
    Alert.alert(
      'Skip onboarding?',
      'You can still use the app with a cold-start feed, and update your style profile later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user?.id) {
                await setOnboardingSkipped(user.id, true);
              }
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            } catch (error) {
              console.error('Failed to persist onboarding skip preference', error);
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!canProceed) return;
    try {
      setSaving(true);
      await api.saveStyleProfile(profile);
      if (user?.id) {
        await setOnboardingSkipped(user.id, false);
      }
      if (mode === 'edit') {
        navigation.goBack();
        return;
      }
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error) {
      console.error('Failed to save style profile', error);
      Alert.alert('Error', 'Could not save your style profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!canProceed) return;
    if (isLastStep) {
      await handleSave();
      return;
    }
    setStep((value) => Math.min(value + 1, STEP_TITLES.length - 1));
  };

  const handleOpenFromSkipIfAvailable = async () => {
    if (!user?.id) return;
    const skipped = await getOnboardingSkipped(user.id);
    if (!skipped) return;
    await setOnboardingSkipped(user.id, false);
  };

  useEffect(() => {
    handleOpenFromSkipIfAvailable().catch((error) =>
      console.error('Failed to clear skip flag when onboarding reopened', error),
    );
  }, [user?.id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111827" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.progressLabel}>
          Step {step + 1}/{STEP_TITLES.length}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.title}>{STEP_TITLES[step]}</Text>
        {step === 0 && mode === 'first_time' ? (
          <Text style={styles.subtitle}>Answer up to 14 quick questions to personalize your app.</Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>{renderStep(step, profile, setProfile)}</ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Pressable
            style={[styles.secondaryButton, step === 0 && styles.disabledButton]}
            disabled={step === 0}
            onPress={() => setStep((value) => Math.max(value - 1, 0))}
          >
            <LineIcon name="back" style={styles.secondaryButtonText} />
          </Pressable>
          <Pressable
            style={[styles.primaryButton, (!canProceed || saving) && styles.disabledButton]}
            disabled={!canProceed || saving}
            onPress={handleContinue}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <LineIcon name={isLastStep ? 'check' : 'plus'} style={styles.primaryButtonText} />
            )}
          </Pressable>
        </View>
        {mode === 'first_time' ? (
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <LineIcon name="close" style={styles.skipButtonText} />
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function renderStep(
  step: number,
  profile: StyleProfileInput,
  setProfile: React.Dispatch<React.SetStateAction<StyleProfileInput>>,
) {
  switch (step) {
    case 0:
      return (
        <OptionGrid
          options={CONTEXT_OPTIONS}
          selected={profile.contexts}
          onToggle={(value) => setProfile((prev) => ({ ...prev, contexts: toggle(prev.contexts, value, 3) }))}
          helperText="Choose up to 3."
        />
      );
    case 1:
      return (
        <OptionGrid
          options={DRESS_CODE_OPTIONS}
          selected={profile.dressCodes}
          onToggle={(value) =>
            setProfile((prev) => ({
              ...prev,
              dressCodes: prev.dressCodes.includes(value) ? prev.dressCodes.filter((item) => item !== value) : [value],
            }))
          }
        />
      );
    case 2:
      return (
        <View style={styles.stepBlock}>
          <OptionGrid
            options={CLIMATE_OPTIONS}
            selected={[profile.climate]}
            onToggle={(value) => setProfile((prev) => ({ ...prev, climate: value as StyleProfileInput['climate'] }))}
          />
          <View style={styles.booleanRow}>
            <Text style={styles.booleanLabel}>Rainy climate often?</Text>
            <Pressable
              style={[styles.booleanChip, profile.rainy && styles.booleanChipActive]}
              onPress={() => setProfile((prev) => ({ ...prev, rainy: !prev.rainy }))}
            >
              <Text style={[styles.booleanChipText, profile.rainy && styles.booleanChipTextActive]}>
                {profile.rainy ? '✓' : '×'}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    case 3:
      return (
        <OptionGrid
          options={FIT_OPTIONS}
          selected={[profile.fitPreference]}
          onToggle={(value) => setProfile((prev) => ({ ...prev, fitPreference: value as StyleProfileInput['fitPreference'] }))}
        />
      );
    case 4:
      return (
        <OptionGrid
          options={ARCHETYPE_OPTIONS}
          selected={profile.archetypes}
          onToggle={(value) => setProfile((prev) => ({ ...prev, archetypes: toggle(prev.archetypes, value, 3) }))}
          helperText="Pick 2 to 3 archetypes."
        />
      );
    case 5:
      return (
        <OptionGrid
          options={RISK_OPTIONS}
          selected={[profile.riskLevel]}
          onToggle={(value) => setProfile((prev) => ({ ...prev, riskLevel: value as StyleProfileInput['riskLevel'] }))}
        />
      );
    case 6:
      return (
        <OptionGrid
          options={NEUTRAL_OPTIONS}
          selected={profile.preferredNeutrals}
          onToggle={(value) => setProfile((prev) => ({ ...prev, preferredNeutrals: toggle(prev.preferredNeutrals, value) }))}
        />
      );
    case 7:
      return (
        <OptionGrid
          options={COLOR_OPTIONS}
          selected={profile.likedColors}
          onToggle={(value) => setProfile((prev) => ({ ...prev, likedColors: toggle(prev.likedColors, value) }))}
        />
      );
    case 8:
      return (
        <OptionGrid
          options={COLOR_OPTIONS}
          selected={profile.avoidedColors}
          onToggle={(value) => setProfile((prev) => ({ ...prev, avoidedColors: toggle(prev.avoidedColors, value) }))}
        />
      );
    case 9:
      return (
        <OptionGrid
          options={PATTERN_OPTIONS}
          selected={[profile.patternComfort]}
          onToggle={(value) => setProfile((prev) => ({ ...prev, patternComfort: value as StyleProfileInput['patternComfort'] }))}
        />
      );
    case 10:
      return (
        <OptionGrid
          options={SHOE_OPTIONS}
          selected={profile.shoesPreference}
          onToggle={(value) => setProfile((prev) => ({ ...prev, shoesPreference: toggle(prev.shoesPreference, value) }))}
        />
      );
    case 11:
      return (
        <OptionGrid
          options={ACCESSORIES_OPTIONS}
          selected={[profile.accessoriesLevel]}
          onToggle={(value) =>
            setProfile((prev) => ({ ...prev, accessoriesLevel: value as StyleProfileInput['accessoriesLevel'] }))
          }
        />
      );
    case 12:
      return (
        <OptionGrid
          options={COMFORT_OPTIONS}
          selected={profile.comfortConstraints}
          onToggle={(value) =>
            setProfile((prev) => ({ ...prev, comfortConstraints: toggle(prev.comfortConstraints, value) }))
          }
        />
      );
    case 13:
      return (
        <View style={styles.stepBlock}>
          <OptionGrid
            options={SHOPPING_INTEREST_OPTIONS}
            selected={[profile.shoppingInterest]}
            onToggle={(value) => setProfile((prev) => ({ ...prev, shoppingInterest: value }))}
            title="Shopping interest"
          />
          <OptionGrid
            options={BUDGET_OPTIONS}
            selected={[profile.budgetBand]}
            onToggle={(value) => setProfile((prev) => ({ ...prev, budgetBand: value }))}
            title="Budget band"
          />
          <View style={styles.textInputBlock}>
            <Text style={styles.fieldLabel}>Height range (optional)</Text>
            <TextInput
              style={styles.input}
              value={profile.heightRange || ''}
              onChangeText={(value) => setProfile((prev) => ({ ...prev, heightRange: value || undefined }))}
              placeholder="e.g. 5'8 - 5'11"
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View style={styles.textInputBlock}>
            <Text style={styles.fieldLabel}>Torso/leg proportions (optional)</Text>
            <TextInput
              style={styles.input}
              value={profile.proportions || ''}
              onChangeText={(value) => setProfile((prev) => ({ ...prev, proportions: value || undefined }))}
              placeholder="e.g. longer legs, shorter torso"
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View style={styles.textInputBlock}>
            <Text style={styles.fieldLabel}>Shoulder width (optional)</Text>
            <TextInput
              style={styles.input}
              value={profile.shoulderWidth || ''}
              onChangeText={(value) => setProfile((prev) => ({ ...prev, shoulderWidth: value || undefined }))}
              placeholder="e.g. narrow, regular, broad"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>
      );
    default:
      return null;
  }
}

function OptionGrid<T extends string>({
  title,
  options,
  selected,
  onToggle,
  helperText,
}: {
  title?: string;
  options: readonly T[];
  selected: string[];
  onToggle: (value: T) => void;
  helperText?: string;
}) {
  return (
    <View style={styles.stepBlock}>
      {title ? <Text style={styles.blockTitle}>{title}</Text> : null}
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
      <View style={styles.grid}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Pressable
              key={option}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onToggle(option)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  progressLabel: {
    color: '#4b5563',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    width: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#111827',
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  stepBlock: {
    marginTop: 8,
    marginBottom: 20,
  },
  blockTitle: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 10,
  },
  helperText: {
    marginBottom: 10,
    color: '#6b7280',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  chipText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  booleanRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  booleanLabel: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
  booleanChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  booleanChipActive: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  booleanChipText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  booleanChipTextActive: {
    color: '#fff',
  },
  textInputBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    fontSize: 15,
  },
  footer: {
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    width: 96,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 15,
  },
  skipButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.45,
  },
});
