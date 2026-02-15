import React, { useMemo } from 'react';
import { RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { WARDROBE_CATEGORY_ORDER } from '../constants';
import { WardrobeAsset, WardrobeAssetsByCategory, WardrobeCategory } from '../types';
import { WardrobeRailSection } from './WardrobeRailSection';
import { WardrobeSurface } from './WardrobeSurface';
import { useAppTheme } from '../../theme';

interface PremiumWardrobeSectionsProps {
  groupedAssets: WardrobeAssetsByCategory;
  refreshing: boolean;
  onRefresh: () => void;
  onAddPress: (category: WardrobeCategory) => void;
  onDeleteAsset: (asset: WardrobeAsset) => void;
}

interface SectionRow {
  category: WardrobeCategory;
  assets: WardrobeAsset[];
}

export function PremiumWardrobeSections({
  groupedAssets,
  refreshing,
  onRefresh,
  onAddPress,
  onDeleteAsset,
}: PremiumWardrobeSectionsProps) {
  const { theme } = useAppTheme();
  const { width, height } = useWindowDimensions();

  const sections = useMemo<SectionRow[]>(
    () =>
      WARDROBE_CATEGORY_ORDER.map((category) => ({
        category,
        assets: groupedAssets[category] || [],
      })),
    [groupedAssets],
  );

  const totalItems = useMemo(
    () => sections.reduce((sum, row) => sum + row.assets.length, 0),
    [sections],
  );

  return (
    <View style={styles.container}>
      <WardrobeSurface width={width} height={height} />
      <FlashList
        data={sections}
        keyExtractor={(item) => item.category}
        renderItem={({ item }) => (
          <WardrobeRailSection
            category={item.category}
            assets={item.assets}
            onAddPress={onAddPress}
            onDeleteAsset={onDeleteAsset}
          />
        )}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Premium Wardrobe</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {totalItems} {totalItems === 1 ? 'piece' : 'pieces'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.tint}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 8,
    paddingBottom: 108,
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
  },
});
