import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { OutfitBackgroundStyle } from '@fashion/shared';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAppTheme } from '../../theme';
import { BuilderCanvasItem } from './types';

interface OutfitCanvasProps {
  items: BuilderCanvasItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onChangeItem: (id: string, patch: Partial<BuilderCanvasItem>) => void;
  backgroundStyle: OutfitBackgroundStyle;
}

export function OutfitCanvas({
  items,
  selectedItemId,
  onSelectItem,
  onChangeItem,
  backgroundStyle,
}: OutfitCanvasProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const canvasStyle = useMemo(() => {
    if (backgroundStyle === 'gradient') {
      return {
        backgroundColor: theme.mode === 'dark' ? '#151c2d' : '#e8eef9',
      };
    }
    if (backgroundStyle === 'paper') {
      return {
        backgroundColor: theme.mode === 'dark' ? '#1f1d1a' : '#f2ebdc',
      };
    }
    return {
      backgroundColor: theme.mode === 'dark' ? '#161a22' : '#f3f4f6',
    };
  }, [backgroundStyle, theme.mode]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    const nextHeight = event.nativeEvent.layout.height;
    setSize((previous) => {
      if (Math.abs(previous.width - nextWidth) < 1 && Math.abs(previous.height - nextHeight) < 1) {
        return previous;
      }
      return { width: nextWidth, height: nextHeight };
    });
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.canvas, canvasStyle]} onLayout={onLayout}>
        {size.width > 0 && size.height > 0 ? (
          items.map((item) => (
            <CanvasItemLayer
              key={item.id}
              item={item}
              selected={item.id === selectedItemId}
              canvasWidth={size.width}
              canvasHeight={size.height}
              onSelectItem={onSelectItem}
              onChangeItem={onChangeItem}
            />
          ))
        ) : null}

        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyGlyph}>◌</Text>
            <Text style={styles.emptyText}>Drop pieces here</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

interface CanvasItemLayerProps {
  item: BuilderCanvasItem;
  selected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSelectItem: (id: string) => void;
  onChangeItem: (id: string, patch: Partial<BuilderCanvasItem>) => void;
}

function CanvasItemLayer({
  item,
  selected,
  canvasWidth,
  canvasHeight,
  onSelectItem,
  onChangeItem,
}: CanvasItemLayerProps) {
  const frame = useMemo(() => itemFrame(item.wardrobeItem.category, canvasWidth), [item.wardrobeItem.category, canvasWidth]);

  const x = useSharedValue(item.x * canvasWidth);
  const y = useSharedValue(item.y * canvasHeight);
  const scale = useSharedValue(item.scale);
  const rotation = useSharedValue(item.rotation);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startRotation = useSharedValue(0);

  useEffect(() => {
    x.value = item.x * canvasWidth;
    y.value = item.y * canvasHeight;
  }, [canvasHeight, canvasWidth, item.x, item.y, x, y]);

  useEffect(() => {
    scale.value = item.scale;
  }, [item.scale, scale]);

  useEffect(() => {
    rotation.value = item.rotation;
  }, [item.rotation, rotation]);

  const commit = useCallback(
    (nextX: number, nextY: number, nextScale: number, nextRotation: number) => {
      onChangeItem(item.id, {
        x: clamp(nextX / canvasWidth, 0, 1),
        y: clamp(nextY / canvasHeight, 0, 1),
        scale: clamp(nextScale, 0.2, 3),
        rotation: normalizeDegrees(nextRotation),
      });
    },
    [canvasHeight, canvasWidth, item.id, onChangeItem],
  );

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = x.value;
      startY.value = y.value;
      runOnJS(onSelectItem)(item.id);
    })
    .onUpdate((event) => {
      x.value = clamp(
        startX.value + event.translationX,
        -frame.width * 0.25,
        canvasWidth + frame.width * 0.25,
      );
      y.value = clamp(
        startY.value + event.translationY,
        -frame.height * 0.25,
        canvasHeight + frame.height * 0.25,
      );
    })
    .onFinalize(() => {
      runOnJS(commit)(x.value, y.value, scale.value, rotation.value);
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
      runOnJS(onSelectItem)(item.id);
    })
    .onUpdate((event) => {
      scale.value = clamp(startScale.value * event.scale, 0.2, 3);
    })
    .onFinalize(() => {
      runOnJS(commit)(x.value, y.value, scale.value, rotation.value);
    });

  const rotate = Gesture.Rotation()
    .onBegin(() => {
      startRotation.value = rotation.value;
      runOnJS(onSelectItem)(item.id);
    })
    .onUpdate((event) => {
      rotation.value = startRotation.value + (event.rotation * 180) / Math.PI;
    })
    .onFinalize(() => {
      runOnJS(commit)(x.value, y.value, scale.value, rotation.value);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onSelectItem)(item.id);
  });

  const gesture = Gesture.Simultaneous(tap, pan, pinch, rotate);

  const animatedStyle = useAnimatedStyle(() => ({
    width: frame.width,
    height: frame.height,
    transform: [
      { translateX: x.value - frame.width / 2 },
      { translateY: y.value - frame.height / 2 },
      { scaleX: item.mirror ? -1 : 1 },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    zIndex: item.zIndex + (selected ? 100 : 0),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.itemLayer,
          selected ? styles.itemLayerSelected : undefined,
          animatedStyle,
        ]}
      >
        <Image
          source={{ uri: item.wardrobeItem.imageCutoutUrl }}
          style={styles.itemImage}
          resizeMode="contain"
        />
        {item.labelVisible && item.labelText ? (
          <View style={styles.label}>
            <Text style={styles.labelText}>{item.labelText}</Text>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 12,
  },
  canvas: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  itemLayer: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  itemLayerSelected: {
    borderWidth: 1,
    borderColor: '#4f46e5',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  label: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  labelText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyGlyph: {
    color: '#94a3b8',
    fontSize: 28,
    fontWeight: '700',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
});

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      padding: 12,
    },
    canvas: {
      flex: 1,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyState: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    emptyGlyph: {
      color: theme.colors.textTertiary,
      fontSize: 28,
      fontWeight: '700',
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}

function itemFrame(category: string, canvasWidth: number): { width: number; height: number } {
  const key = category.toLowerCase();
  if (containsAny(key, ['shoe', 'sneaker', 'boot', 'heel', 'sandal', 'loafer'])) {
    const width = canvasWidth * 0.26;
    return { width, height: width * 0.7 };
  }
  if (containsAny(key, ['accessory', 'bag', 'hat', 'belt', 'jewel'])) {
    const width = canvasWidth * 0.24;
    return { width, height: width * 0.85 };
  }
  if (containsAny(key, ['dress', 'jumpsuit', 'onepiece'])) {
    const height = canvasWidth * 0.54;
    return { width: height * 0.68, height };
  }
  if (containsAny(key, ['pants', 'bottom', 'jean', 'skirt', 'short'])) {
    const height = canvasWidth * 0.42;
    return { width: height * 0.72, height };
  }
  const height = canvasWidth * 0.42;
  return { width: height * 0.85, height };
}

function containsAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

function normalizeDegrees(value: number): number {
  let next = value % 360;
  if (next > 180) next -= 360;
  if (next < -180) next += 360;
  return next;
}
