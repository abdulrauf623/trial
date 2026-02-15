import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { BlurMask, Canvas, RoundedRect } from '@shopify/react-native-skia';
import { CATEGORY_DISPLAY_HEIGHT } from '../constants';
import { WardrobeAsset, WardrobeCategory } from '../types';
import { useAppTheme } from '../../theme';
import { Icon } from '../../components/Icon';

interface WardrobeRailItemProps {
  asset: WardrobeAsset;
  category: WardrobeCategory;
  index: number;
  railY: number;
  scrollX: SharedValue<number>;
  focusedId: string | null;
  onFocusChange: (id: string | null) => void;
  onDelete: (asset: WardrobeAsset) => void;
}

export function WardrobeRailItem({
  asset,
  category,
  index,
  railY,
  scrollX,
  focusedId,
  onFocusChange,
  onDelete,
}: WardrobeRailItemProps) {
  const { theme } = useAppTheme();
  const isFocused = focusedId === asset.id;
  const hasFocus = focusedId !== null;
  const rotation = seededRange(`${asset.id}:rotation`, -2, 2);
  const depthScale = seededRange(`${asset.id}:depth`, 0.97, 1.03);
  const overlapRatio = seededRange(`${asset.id}:overlap`, 0, 1) > 0.74
    ? seededRange(`${asset.id}:overlap-ratio`, 0.1, 0.18)
    : 0;

  const metrics = useMemo(() => {
    const targetHeight = CATEGORY_DISPLAY_HEIGHT[category];
    const imageScale = targetHeight / Math.max(asset.height, 1);
    const imageWidth = Math.max(72, asset.width * imageScale);
    const imageHeight = targetHeight;
    const anchorY = asset.anchor.y * imageScale;
    const itemHeight = Math.max(268, railY + imageHeight + 64);
    const imageTop = clamp(railY - anchorY, 6, itemHeight - imageHeight - 42);
    const itemWidth = imageWidth + 30 - imageWidth * overlapRatio;
    const shadowWidth = Math.max(46, imageWidth * 0.56);
    const shadowHeight = Math.max(12, imageHeight * 0.08);

    return {
      imageWidth,
      imageHeight,
      imageTop,
      itemWidth,
      itemHeight,
      shadowWidth,
      shadowHeight,
      shadowX: Math.max(0, (imageWidth - shadowWidth) / 2 + 6),
      shadowY: imageTop + imageHeight - shadowHeight * 0.25,
      imageLeft: 6,
    };
  }, [asset.anchor.y, asset.height, asset.width, category, overlapRatio, railY]);

  const animatedStyle = useAnimatedStyle(() => {
    const distance = index * 182 - scrollX.value;
    const parallaxY = interpolate(distance, [-220, 0, 220], [4, 0, 4], Extrapolation.CLAMP);
    const opacity = hasFocus ? (isFocused ? 1 : 0.2) : 1;
    const focusScale = hasFocus ? (isFocused ? 1.06 : 0.92) : 1;

    return {
      opacity: withTiming(opacity, { duration: 180 }),
      transform: [
        { translateY: parallaxY },
        { rotateZ: `${rotation}deg` },
        { scale: withTiming(depthScale * focusScale, { duration: 200 }) },
      ],
    };
  }, [depthScale, hasFocus, index, isFocused, rotation, scrollX]);

  return (
    <Animated.View
      style={[
        styles.itemContainer,
        {
          width: metrics.itemWidth,
          height: metrics.itemHeight,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={() => onFocusChange(isFocused ? null : asset.id)}
        style={styles.imagePressable}
      >
        <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
          <RoundedRect
            x={metrics.shadowX}
            y={metrics.shadowY}
            width={metrics.shadowWidth}
            height={metrics.shadowHeight}
            r={metrics.shadowHeight / 2}
            color={theme.mode === 'dark' ? 'rgba(4, 6, 8, 0.38)' : 'rgba(17, 24, 39, 0.16)'}
          >
            <BlurMask blur={8} style="normal" />
          </RoundedRect>
        </Canvas>

        <Image
          source={{ uri: asset.processedUri || asset.thumbUri || asset.originalUri }}
          style={[
            styles.garmentImage,
            {
              width: metrics.imageWidth,
              height: metrics.imageHeight,
              top: metrics.imageTop,
              left: metrics.imageLeft,
            },
          ]}
          resizeMode="contain"
          fadeDuration={80}
        />
      </Pressable>

      {isFocused ? (
        <View
          style={[
            styles.focusActions,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surfaceElevated,
            },
          ]}
        >
          <Pressable style={styles.actionButton} onPress={() => onFocusChange(null)}>
            <Icon name="close" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.actionLabel, { color: theme.colors.textSecondary }]}>Done</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => onDelete(asset)}>
            <Icon name="trash" size={16} color={theme.colors.danger} />
            <Text style={[styles.actionLabel, { color: theme.colors.danger }]}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    justifyContent: 'flex-end',
    paddingRight: 8,
  },
  imagePressable: {
    flex: 1,
  },
  garmentImage: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  focusActions: {
    position: 'absolute',
    left: 10,
    right: 18,
    bottom: 8,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 88,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function seededRange(seed: string, min: number, max: number) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  const normalized = ((Math.sin(hash) * 10000) % 1 + 1) % 1;
  return min + (max - min) * normalized;
}
