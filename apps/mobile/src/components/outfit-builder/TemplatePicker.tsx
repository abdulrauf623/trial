import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme';

export type OutfitTemplateId = 'editorial' | 'center' | 'grid_2x2';

interface TemplatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (template: OutfitTemplateId) => void;
}

const TEMPLATES: Array<{ id: OutfitTemplateId; title: string; glyph: string }> = [
  { id: 'editorial', title: 'Editorial', glyph: '▤' },
  { id: 'center', title: 'Center', glyph: '◎' },
  { id: 'grid_2x2', title: '2×2', glyph: '▦' },
];

export function TemplatePicker({ visible, onClose, onSelect }: TemplatePickerProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          {TEMPLATES.map((template) => (
            <Pressable
              key={template.id}
              style={({ pressed }) => [styles.templateRow, pressed && styles.templateRowPressed]}
              onPress={() => {
                onSelect(template.id);
                onClose();
              }}
            >
              <Text style={styles.glyph}>{template.glyph}</Text>
              <Text style={styles.title}>{template.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 22,
      gap: 8,
    },
    templateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 13,
      backgroundColor: theme.colors.surfaceElevated,
    },
    templateRowPressed: {
      opacity: 0.82,
    },
    glyph: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '700',
      width: 24,
      textAlign: 'center',
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
