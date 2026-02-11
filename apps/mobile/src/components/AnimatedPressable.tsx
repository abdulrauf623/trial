import React, { useCallback } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableComponentProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  pressScale?: number; // Scale on press (default: 0.95)
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
}

/**
 * Premium animated pressable component with smooth scale animation
 * Usage: Replace all TouchableOpacity/Pressable with this component
 */
export function AnimatedPressableComponent({
  children,
  style,
  pressScale = 0.95,
  springConfig = {
    damping: 20,
    stiffness: 90,
    mass: 1,
  },
  onPressIn,
  onPressOut,
  ...pressableProps
}: AnimatedPressableComponentProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (event: any) => {
      scale.value = withSpring(pressScale, springConfig);
      onPressIn?.(event);
    },
    [pressScale, springConfig, onPressIn, scale]
  );

  const handlePressOut = useCallback(
    (event: any) => {
      scale.value = withSpring(1, springConfig);
      onPressOut?.(event);
    },
    [springConfig, onPressOut, scale]
  );

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...pressableProps}
    >
      {children}
    </AnimatedPressable>
  );
}
