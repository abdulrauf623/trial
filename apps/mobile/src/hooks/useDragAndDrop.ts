import { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { springConfig } from '../utils/animations';

interface UseDragAndDropOptions {
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  onDrop?: (x: number, y: number) => void;
  boundX?: { min: number; max: number };
  boundY?: { min: number; max: number };
}

export function useDragAndDrop(options: UseDragAndDropOptions = {}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const clamp = (value: number, min?: number, max?: number) => {
    'worklet';
    if (min !== undefined && value < min) return min;
    if (max !== undefined && value > max) return max;
    return value;
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
      startX.value = translateX.value;
      startY.value = translateY.value;
      if (options.onDragStart) {
        runOnJS(options.onDragStart)();
      }
    })
    .onUpdate((event) => {
      const newX = startX.value + event.translationX;
      const newY = startY.value + event.translationY;

      translateX.value = clamp(newX, options.boundX?.min, options.boundX?.max);
      translateY.value = clamp(newY, options.boundY?.min, options.boundY?.max);
    })
    .onEnd(() => {
      isDragging.value = false;
      const finalX = translateX.value;
      const finalY = translateY.value;

      if (options.onDragEnd) {
        runOnJS(options.onDragEnd)(finalX, finalY);
      }
      if (options.onDrop) {
        runOnJS(options.onDrop)(finalX, finalY);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: withSpring(isDragging.value ? 1.1 : 1, springConfig) },
    ],
    zIndex: isDragging.value ? 1000 : 1,
  }));

  const reset = () => {
    translateX.value = withSpring(0, springConfig);
    translateY.value = withSpring(0, springConfig);
  };

  const snapTo = (x: number, y: number) => {
    translateX.value = withSpring(x, springConfig);
    translateY.value = withSpring(y, springConfig);
  };

  return {
    gesture,
    animatedStyle,
    isDragging,
    translateX,
    translateY,
    reset,
    snapTo,
  };
}
