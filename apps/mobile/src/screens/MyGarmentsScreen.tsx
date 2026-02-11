import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { UserGarment } from '@fashion/shared';
import { RootStackParamList } from '../navigation/types';
import { LineIcon } from '../components/LineIcon';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function MyGarmentsScreen() {
  const navigation = useNavigation<RootNav>();
  const [garments, setGarments] = useState<UserGarment[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGarments = async () => {
    try {
      const response = await api.listUserGarments(selectedCategory, 100);
      setGarments(response.garments);
      setCategories(response.categories);
    } catch (error) {
      console.error('Failed to load garments:', error);
      Alert.alert('Error', 'Failed to load garments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log('[MyGarments] Screen focused, reloading garments');
      loadGarments();
    }, [selectedCategory])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadGarments();
  };

  const handleCategoryPress = (category: string | undefined) => {
    setSelectedCategory(category);
    setLoading(true);
  };

  const handleGarmentPress = (garment: UserGarment) => {
    navigation.navigate('GarmentDetail', { garmentId: garment.id });
  };

  const handleAddGarment = () => {
    navigation.navigate('UploadGarment');
  };

  const renderCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesContainer}
      contentContainerStyle={styles.categoriesContent}
    >
      <TouchableOpacity
        style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
        onPress={() => handleCategoryPress(undefined)}
      >
        <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
          All
        </Text>
      </TouchableOpacity>

      {categories.map((category) => (
        <TouchableOpacity
          key={category}
          style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
          onPress={() => handleCategoryPress(category)}
        >
          <Text
            style={[
              styles.categoryChipText,
              selectedCategory === category && styles.categoryChipTextActive,
            ]}
          >
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderGarmentItem = ({ item }: { item: UserGarment }) => (
    <TouchableOpacity style={styles.garmentItem} onPress={() => handleGarmentPress(item)}>
      {item.status === 'processing' && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}

      {item.thumbnailUrl || item.processedUrl || item.originalUrl ? (
        <Image
          source={{ uri: (item.thumbnailUrl || item.processedUrl || item.originalUrl)! }}
          style={styles.garmentImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.garmentImage, styles.placeholderImage]}>
          <LineIcon name="wardrobe" style={styles.placeholderText} />
        </View>
      )}

      {item.category && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category}</Text>
        </View>
      )}

      {item.dominantHex && (
        <View style={styles.colorIndicator}>
          <View style={[styles.colorDot, { backgroundColor: item.dominantHex }]} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <LineIcon name="wardrobe" style={styles.emptyEmoji} />
      <Text style={styles.emptyTitle}>No Garments Yet</Text>
      <Text style={styles.emptySubtitle}>
        {selectedCategory
          ? `No ${selectedCategory} items in your wardrobe`
          : 'Start building your digital wardrobe'}
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAddGarment}>
        <LineIcon name="plus" style={styles.emptyButtonText} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Wardrobe</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddGarment}>
          <LineIcon name="plus" style={styles.addButtonText} />
        </TouchableOpacity>
      </View>

      {categories.length > 0 && renderCategoryFilter()}

      <FlatList
        data={garments}
        renderItem={renderGarmentItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={renderEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  categoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoriesContent: {
    padding: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#000',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textTransform: 'capitalize',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  grid: {
    padding: 8,
  },
  garmentItem: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  garmentImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  processingText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  colorIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
