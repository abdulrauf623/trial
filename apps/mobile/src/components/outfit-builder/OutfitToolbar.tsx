import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { OutfitBackgroundStyle } from '@fashion/shared';
import { useAppTheme } from '../../theme';
import { LineIcon } from '../LineIcon';

interface OutfitToolbarProps {
  name: string;
  onChangeName: (value: string) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  backgroundStyle: OutfitBackgroundStyle;
  onBackgroundStyleChange: (style: OutfitBackgroundStyle) => void;
  onOpenTemplates: () => void;
}

const BACKGROUND_ORDER: OutfitBackgroundStyle[] = ['solid', 'gradient', 'paper'];

export function OutfitToolbar({
  name,
  onChangeName,
  onBack,
  onSave,
  saving,
  backgroundStyle,
  onBackgroundStyleChange,
  onOpenTemplates,
}: OutfitToolbarProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
      >
        <LineIcon name="back" size={26} color={theme.colors.icon} />
      </Pressable>

      <TextInput
        value={name}
        onChangeText={onChangeName}
        placeholder="Outfit"
        placeholderTextColor={theme.colors.textTertiary}
        style={styles.input}
      />

      <Pressable
        onPress={onOpenTemplates}
        style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
      >
        <LineIcon name="grid" size={20} color={theme.colors.icon} />
      </Pressable>

      <Pressable
        onPress={() => {
          const index = BACKGROUND_ORDER.indexOf(backgroundStyle);
          const next = BACKGROUND_ORDER[(index + 1) % BACKGROUND_ORDER.length];
          onBackgroundStyleChange(next);
        }}
        style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
      >
        <LineIcon name="tune" size={20} color={theme.colors.icon} />
      </Pressable>

      <Pressable
        onPress={onSave}
        disabled={saving}
        style={({ pressed }) => [
          styles.iconButton,
          styles.saveButton,
          pressed && styles.iconButtonPressed,
          saving && styles.iconButtonDisabled,
        ]}
      >
        <LineIcon
          name="check"
          size={22}
          color={theme.mode === 'dark' ? '#0b1220' : '#ffffff'}
        />
      </Pressable>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 8,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      height: 40,
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceElevated,
    },
    saveButton: {
      backgroundColor: theme.colors.tint,
      borderColor: theme.colors.tint,
    },
    iconButtonPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.98 }],
    },
    iconButtonDisabled: {
      opacity: 0.5,
    },
  });
}
