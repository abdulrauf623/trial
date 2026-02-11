import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BuilderWardrobeItem, BuilderWardrobeItemSource } from '@fashion/shared';
import { useAppTheme } from '../../theme';
import { LineIcon } from '../LineIcon';

interface WardrobeTrayProps {
  items: BuilderWardrobeItem[];
  loading: boolean;
  source: BuilderWardrobeItemSource | 'all';
  onSourceChange: (source: BuilderWardrobeItemSource | 'all') => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onAddItem: (item: BuilderWardrobeItem) => void;
  selectedIds: Set<string>;
}

const SOURCE_FILTERS: Array<{ id: BuilderWardrobeItemSource | 'all'; icon: 'grid' | 'gallery' | 'bookmark' }> = [
  { id: 'all', icon: 'grid' },
  { id: 'upload', icon: 'gallery' },
  { id: 'saved_post', icon: 'bookmark' },
];

export function WardrobeTray({
  items,
  loading,
  source,
  onSourceChange,
  selectedCategory,
  onCategoryChange,
  onAddItem,
  selectedIds,
}: WardrobeTrayProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const categories = useMemo(() => {
    const values = new Set<string>(['all']);
    for (const item of items) {
      values.add(item.category.toLowerCase());
    }
    return Array.from(values);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (source !== 'all' && item.sourceType !== source) return false;
      if (selectedCategory !== 'all' && item.category.toLowerCase() !== selectedCategory) return false;
      return true;
    });
  }, [items, selectedCategory, source]);

  return (
    <View style={styles.container}>
      <View style={styles.filtersRow}>
        <View style={styles.sourceRow}>
          {SOURCE_FILTERS.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => onSourceChange(filter.id)}
              style={({ pressed }) => [
                styles.sourceButton,
                source === filter.id && styles.sourceButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <LineIcon
                name={filter.icon}
                size={17}
                color={source === filter.id ? theme.colors.surface : theme.colors.icon}
              />
            </Pressable>
          ))}
        </View>

        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onCategoryChange(item)}
              style={({ pressed }) => [
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === item && styles.categoryChipTextActive,
                ]}
              >
                {item === 'all' ? 'all' : item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.colors.tint} />
        </View>
      ) : (
        <FlatList
          horizontal
          data={filtered}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.itemsRow}
          renderItem={({ item }) => {
            const selected = selectedIds.has(item.id);
            return (
              <Pressable
                onPress={() => onAddItem(item)}
                style={({ pressed }) => [
                  styles.itemCard,
                  selected && styles.itemCardSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Image source={{ uri: item.imageCutoutUrl }} style={styles.itemImage} resizeMode="cover" />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No items</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingTop: 10,
      paddingBottom: 12,
      gap: 10,
    },
    filtersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      gap: 8,
    },
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sourceButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceElevated,
    },
    sourceButtonActive: {
      backgroundColor: theme.colors.tint,
      borderColor: theme.colors.tint,
    },
    categoryRow: {
      gap: 8,
      paddingRight: 8,
    },
    categoryChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
    },
    categoryChipActive: {
      backgroundColor: theme.colors.tint,
      borderColor: theme.colors.tint,
    },
    categoryChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'lowercase',
    },
    categoryChipTextActive: {
      color: theme.mode === 'dark' ? '#0b1220' : '#ffffff',
    },
    loadingRow: {
      height: 96,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemsRow: {
      paddingHorizontal: 12,
      gap: 10,
    },
    itemCard: {
      width: 78,
      height: 96,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
    },
    itemCardSelected: {
      borderColor: theme.colors.tint,
      borderWidth: 2,
    },
    itemImage: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.surfaceMuted,
    },
    empty: {
      height: 96,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.82,
    },
  });
}
