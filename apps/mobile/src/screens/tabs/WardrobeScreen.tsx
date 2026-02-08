import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { WardrobeItem } from '@fashion/shared';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SPACING = 12;
const SIDE_PADDING = 16;
const NUM_COLUMNS = 3;
const ITEM_WIDTH = (SCREEN_WIDTH - SIDE_PADDING * 2 - ITEM_SPACING * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export function WardrobeScreen() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedColor, setSelectedColor] = useState('All');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);

  // Reload data when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[WardrobeScreen] Tab focused, reloading data');
      loadFilters();
      loadWardrobe();
    }, [selectedCategory, selectedColor])
  );

  useEffect(() => {
    loadWardrobe();
  }, [selectedCategory, selectedColor]);

  const loadFilters = async () => {
    try {
      const filters = await api.getWardrobeFilters();
      setAvailableCategories(filters.categories);
      setAvailableColors(filters.colors);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  const loadWardrobe = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const category = selectedCategory !== 'All' ? selectedCategory : undefined;
      const color = selectedColor !== 'All' ? selectedColor : undefined;
      const data = await api.getWardrobe(category, color);
      setItems(data);
      console.log(`[WardrobeScreen] Loaded ${data.length} items`);
    } catch (error) {
      console.error('Failed to load wardrobe:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadFilters();
    loadWardrobe(true);
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      // Optimistic update
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      await api.removeFromWardrobe(itemId);
      await api.trackEvent({
        eventName: 'item_removed_from_wardrobe',
        properties: { itemId },
      });
      // Reload filters in case we removed the last item of a category/color
      loadFilters();
    } catch (error) {
      console.error('Failed to remove item:', error);
      // Reload on error
      loadWardrobe();
    }
  };

  const renderItem = ({ item }: { item: WardrobeItem }) => {
    const imageUrl = item.clothingItem.post.imageUrls[item.clothingItem.imageIndex];

    return (
      <View style={styles.itemContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.itemImage}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.id)}
        >
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.itemInfo}>
          {item.clothingItem.brand && (
            <Text style={styles.itemBrand} numberOfLines={1}>
              {item.clothingItem.brand}
            </Text>
          )}
          {item.clothingItem.name && (
            <Text style={styles.itemName} numberOfLines={1}>
              {item.clothingItem.name}
            </Text>
          )}
          {item.clothingItem.price && (
            <Text style={styles.itemPrice}>${item.clothingItem.price.toFixed(2)}</Text>
          )}
        </View>
      </View>
    );
  };

  const categories = ['All', ...availableCategories];
  const colors = ['All', ...availableColors];

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      {categories.length > 1 && (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterChip,
                  selectedCategory === category && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === category && styles.filterChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Color Filter */}
      {colors.length > 1 && (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Color</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {colors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.filterChip,
                  selectedColor === color && styles.filterChipActive,
                ]}
                onPress={() => setSelectedColor(color)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedColor === color && styles.filterChipTextActive,
                  ]}
                >
                  {color}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Items Grid */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>💾</Text>
          <Text style={styles.emptyText}>No items in your wardrobe yet</Text>
          <Text style={styles.emptySubtext}>
            Save posts to automatically add all their items here!
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#000"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filterSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: SIDE_PADDING,
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: SIDE_PADDING,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  gridContainer: {
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 16,
    paddingBottom: 32,
  },
  row: {
    justifyContent: 'flex-start',
    gap: ITEM_SPACING,
    marginBottom: ITEM_SPACING,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemImage: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.4,
    backgroundColor: '#e0e0e0',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  itemInfo: {
    padding: 8,
  },
  itemBrand: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  itemName: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
