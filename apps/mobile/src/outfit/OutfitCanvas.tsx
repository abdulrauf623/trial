import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import {
  BlurMask,
  Canvas,
  Group,
  Image as SkiaImage,
  LinearGradient,
  Rect,
  RoundedRect,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import { buildShadowSpec } from './shadow';
import { estimateGarmentBounds, solveOutfitLayout } from './layoutSolver';
import { buildLayoutCacheKey, useOutfitLayoutStore } from './useOutfitLayoutStore';
import { ClothingItem, LayoutItem, OutfitSurface } from './types';

const SURFACE_COLOR = '#f5f2ee';

export interface OutfitCanvasProps {
  items: ClothingItem[];
  style?: StyleProp<ViewStyle>;
  onLayoutComputed?: (layout: LayoutItem[], surface: OutfitSurface) => void;
}

export function OutfitCanvas({ items, style, onLayoutComputed }: OutfitCanvasProps) {
  const [surface, setSurface] = useState<OutfitSurface>({ width: 0, height: 0 });
  const setCachedLayout = useOutfitLayoutStore((state) => state.setLayout);
  const cacheKey = useMemo(() => buildLayoutCacheKey(items, surface), [items, surface]);
  const cachedLayout = useOutfitLayoutStore((state) => state.layoutByKey[cacheKey]);

  const layout = useMemo(() => {
    if (surface.width <= 0 || surface.height <= 0 || items.length === 0) {
      return [];
    }
    return cachedLayout || solveOutfitLayout(items, surface);
  }, [cachedLayout, items, surface]);

  useEffect(() => {
    if (cacheKey === 'empty' || cachedLayout || layout.length === 0) {
      return;
    }
    setCachedLayout(cacheKey, layout);
  }, [cacheKey, cachedLayout, layout, setCachedLayout]);

  const orderedLayout = useMemo(
    () => [...layout].sort((a, b) => a.zIndex - b.zIndex),
    [layout],
  );

  useEffect(() => {
    if (!onLayoutComputed) return;
    onLayoutComputed(orderedLayout, surface);
  }, [onLayoutComputed, orderedLayout, surface]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    const nextHeight = event.nativeEvent.layout.height;
    setSurface((previous) => {
      if (Math.abs(previous.width - nextWidth) < 1 && Math.abs(previous.height - nextHeight) < 1) {
        return previous;
      }
      return {
        width: nextWidth,
        height: nextHeight,
      };
    });
  }, []);

  return (
    <View style={[styles.root, style]} onLayout={onLayout}>
      {surface.width > 0 && surface.height > 0 ? (
        <Canvas style={styles.canvas}>
          <RoundedRect x={0} y={0} width={surface.width} height={surface.height} r={22} color={SURFACE_COLOR} />
          <Rect x={0} y={0} width={surface.width} height={surface.height}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(surface.width, surface.height)}
              colors={['rgba(255,255,255,0.24)', 'rgba(0,0,0,0.05)']}
            />
          </Rect>

          {orderedLayout.map((entry) => (
            <FlatLayGarment key={entry.item.id} layout={entry} surface={surface} />
          ))}
        </Canvas>
      ) : null}
    </View>
  );
}

interface FlatLayGarmentProps {
  layout: LayoutItem;
  surface: OutfitSurface;
}

function FlatLayGarment({ layout, surface }: FlatLayGarmentProps) {
  const image = useImage(layout.item.imageUri);
  const bounds = useMemo(
    () => estimateGarmentBounds(layout.item, surface, layout.scale),
    [layout.item, layout.scale, surface],
  );
  const shadow = useMemo(() => buildShadowSpec(layout, surface), [layout, surface]);
  const left = layout.x - bounds.width / 2;
  const top = layout.y - bounds.height / 2;
  const rotation = (layout.rotation * Math.PI) / 180;

  return (
    <Group
      transform={[
        { translateX: layout.x },
        { translateY: layout.y },
        { rotate: rotation },
        { translateX: -layout.x },
        { translateY: -layout.y },
      ]}
    >
      <RoundedRect
        x={shadow.x}
        y={shadow.y}
        width={shadow.width}
        height={shadow.height}
        r={shadow.radius}
        color={`rgba(27, 24, 21, ${shadow.opacity})`}
      >
        <BlurMask blur={shadow.blur} style="normal" />
      </RoundedRect>

      {image ? (
        <SkiaImage image={image} x={left} y={top} width={bounds.width} height={bounds.height} fit="contain" />
      ) : (
        <RoundedRect x={left} y={top} width={bounds.width} height={bounds.height} r={10} color="#ddd7cf" />
      )}
    </Group>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: SURFACE_COLOR,
  },
  canvas: {
    flex: 1,
  },
});

