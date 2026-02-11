import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../../theme';
import { LineIcon } from '../LineIcon';

interface TransformControlsProps {
  visible: boolean;
  onBringForward: () => void;
  onSendBackward: () => void;
  onMirror: () => void;
  onToggleLabel: () => void;
  onDelete: () => void;
}

export function TransformControls({
  visible,
  onBringForward,
  onSendBackward,
  onMirror,
  onToggleLabel,
  onDelete,
}: TransformControlsProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ToolButton icon="layers" onPress={onBringForward} />
      <ToolButton icon="grid" onPress={onSendBackward} />
      <ToolButton icon="link" onPress={onMirror} />
      <ToolButton icon="edit" onPress={onToggleLabel} />
      <ToolButton icon="trash" onPress={onDelete} destructive />
    </View>
  );
}

interface ToolButtonProps {
  icon: 'layers' | 'grid' | 'link' | 'edit' | 'trash';
  onPress: () => void;
  destructive?: boolean;
}

function ToolButton({ icon, onPress, destructive }: ToolButtonProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <LineIcon
        name={icon}
        size={18}
        color={destructive ? theme.colors.danger : theme.colors.icon}
      />
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    button: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceElevated,
    },
    buttonPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.98 }],
    },
  });
}
