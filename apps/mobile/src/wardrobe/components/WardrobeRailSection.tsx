import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { Canvas, RoundedRect } from '@shopify/react-native-skia';
import { WARDROBE_CATEGORY_LABELS } from '../constants';
import { WardrobeAsset, WardrobeCategory } from '../types';
import { WardrobeRailItem } from './WardrobeRailItem';
import { useAppTheme } from '../../theme';
import { Icon } from '../../components/Icon';

const RAIL_Y = 34;
const SECTION_HEIGHT = 300;

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList,
) as unknown as React.ComponentType<React.ComponentProps<typeof FlashList<WardrobeAsset>>>;

interface WardrobeRailSectionProps {
  category: WardrobeCategory;
  assets: WardrobeAsset[];
  onAddPress: (category: WardrobeCategory) => void;
  onDeleteAsset: (asset: WardrobeAsset) => void;
}

export function WardrobeRailSection({
  category,
  assets,
  onAddPress,
  onDeleteAsset,
}: WardrobeRailSectionProps) {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const railColor = theme.mode === 'dark' ? 'rgba(226,232,240,0.32)' : 'rgba(71,84,103,0.26)';
  const sectionTitle = WARDROBE_CATEGORY_LABELS[category];

  const titleText = useMemo(() => `${sectionTitle} (${assets.length})`, [assets.length, sectionTitle]);

  return (
    <View style={styles.sectionWrapper}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>{titleText}</Text>
        <Pressable
          onPress={() => onAddPress(category)}
          style={[
            styles.addButton,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surfaceElevated,
            },
          ]}
        >
          <Icon name="plus" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.addButtonText, { color: theme.colors.textSecondary }]}>Add</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.railBody,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.mode === 'dark' ? 'rgba(17,24,39,0.28)' : 'rgba(255,255,255,0.35)',
          },
        ]}
      >
        <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
          <RoundedRect x={14} y={RAIL_Y} width={Math.max(0, width - 46)} height={2} r={1} color={railColor} />
        </Canvas>

        {assets.length > 0 ? (
          <AnimatedFlashList
            data={assets}
            horizontal
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <WardrobeRailItem
                asset={item}
                category={category}
                index={index}
                railY={RAIL_Y}
                scrollX={scrollX}
                focusedId={focusedId}
                onFocusChange={setFocusedId}
                onDelete={onDeleteAsset}
              />
            )}
            extraData={focusedId}
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContent}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <Pressable
            onPress={() => onAddPress(category)}
            style={styles.emptyRow}
          >
            <Icon name="upload" size={18} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Add your first piece
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionWrapper: {
    marginBottom: 18,
  },
  headerRow: {
    minHeight: 42,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  addButton: {
    minHeight: 32,
    minWidth: 74,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  railBody: {
    minHeight: SECTION_HEIGHT,
    borderWidth: 1,
    borderRadius: 22,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  railContent: {
    paddingTop: 2,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  emptyRow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
