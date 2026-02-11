import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CreatedOutfit, WardrobeItem, UserGarment } from '@fashion/shared';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { api } from '../../services/api';
import { RootStackParamList } from '../../navigation/types';
import { AppTheme, useAppTheme } from '../../theme';
import { LineIcon } from '../../components/LineIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SPACING = 12;
const SIDE_PADDING = 16;
const NUM_COLUMNS = 3;
const ITEM_WIDTH = (SCREEN_WIDTH - SIDE_PADDING * 2 - ITEM_SPACING * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const EMPTY_WARDROBE_PHOTO =
  'https://images.pexels.com/photos/7601165/pexels-photo-7601165.jpeg?auto=compress&cs=tinysrgb&w=1200';

type TabType = 'my-garments' | 'my-outfits' | 'saved-items';
type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function WardrobeScreen() {
  const navigation = useNavigation<RootNav>();
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<TabType>('my-garments');

  // Saved items from posts
  const [savedItems, setSavedItems] = useState<WardrobeItem[]>([]);
  const [savedItemsLoading, setSavedItemsLoading] = useState(true);

  // User-uploaded garments
  const [myGarments, setMyGarments] = useState<UserGarment[]>([]);
  const [myGarmentsLoading, setMyGarmentsLoading] = useState(true);
  const [garmentCategories, setGarmentCategories] = useState<string[]>([]);

  // Saved outfits
  const [savedOutfits, setSavedOutfits] = useState<CreatedOutfit[]>([]);
  const [outfitsLoading, setOutfitsLoading] = useState(true);
  const [outfitSwipeIndex, setOutfitSwipeIndex] = useState(0);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedColor, setSelectedColor] = useState('All');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [showActionSheet, setShowActionSheet] = useState(false);

  // Reload data when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[WardrobeScreen] Tab focused, reloading data');
      loadAllData();
    }, [selectedCategory, selectedColor, activeTab])
  );

  const loadAllData = async () => {
    if (activeTab === 'my-garments') {
      await loadMyGarments();
    } else if (activeTab === 'my-outfits') {
      await loadSavedOutfits();
    } else {
      await loadFilters();
      await loadSavedItems();
    }
  };

  const loadFilters = async () => {
    try {
      const filters = await api.getWardrobeFilters();
      setAvailableCategories(filters.categories);
      setAvailableColors(filters.colors);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  const loadSavedItems = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setSavedItemsLoading(true);
      }
      const category = selectedCategory !== 'All' ? selectedCategory : undefined;
      const color = selectedColor !== 'All' ? selectedColor : undefined;
      const data = await api.getWardrobe(category, color);
      setSavedItems(data);
      console.log(`[WardrobeScreen] Loaded ${data.length} saved items`);
    } catch (error) {
      console.error('Failed to load saved items:', error);
    } finally {
      setSavedItemsLoading(false);
      setRefreshing(false);
    }
  };

  const loadMyGarments = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setMyGarmentsLoading(true);
      }
      const category = selectedCategory !== 'All' ? selectedCategory : undefined;
      const response = await api.listUserGarments(category, 100);
      setMyGarments(response.garments);
      setGarmentCategories(response.categories);
      console.log(`[WardrobeScreen] Loaded ${response.garments.length} user garments`);
    } catch (error) {
      console.error('Failed to load user garments:', error);
    } finally {
      setMyGarmentsLoading(false);
      setRefreshing(false);
    }
  };

  const loadSavedOutfits = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setOutfitsLoading(true);
      }
      const response = await api.listSavedOutfits();
      setSavedOutfits(response.outfits);
      console.log(`[WardrobeScreen] Loaded ${response.outfits.length} saved outfits`);
    } catch (error) {
      console.error('Failed to load saved outfits:', error);
      // If endpoint doesn't exist yet, just set empty array
      setSavedOutfits([]);
    } finally {
      setOutfitsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedCategory, selectedColor, activeTab]);

  useEffect(() => {
    if (savedOutfits.length === 0) {
      setOutfitSwipeIndex(0);
      return;
    }

    setOutfitSwipeIndex((previous) => normalizeLoopIndex(previous, savedOutfits.length));
  }, [savedOutfits.length]);

  const handleRefresh = () => {
    if (activeTab === 'my-garments') {
      loadMyGarments(true);
    } else if (activeTab === 'my-outfits') {
      loadSavedOutfits(true);
    } else {
      loadFilters();
      loadSavedItems(true);
    }
  };

  const handleRemoveSavedItem = async (itemId: string) => {
    try {
      setSavedItems((prev) => prev.filter((item) => item.id !== itemId));
      await api.removeFromWardrobe(itemId);
      await api.trackEvent({
        eventName: 'item_removed_from_wardrobe',
        properties: { itemId },
      });
      loadFilters();
    } catch (error) {
      console.error('Failed to remove item:', error);
      loadSavedItems();
    }
  };

  const handleUploadGarment = () => {
    navigation.navigate('UploadGarment');
  };

  const handleViewGarmentDetail = (garmentId: string) => {
    navigation.navigate('GarmentDetail', { garmentId });
  };

  const handleCreateOutfit = () => {
    setShowActionSheet(false);
    navigation.navigate('OutfitBuilder');
  };

  const handleOpenActionSheet = () => {
    setShowActionSheet(true);
  };

  const handleCloseActionSheet = () => {
    setShowActionSheet(false);
  };

  const handleAddClothes = () => {
    setShowActionSheet(false);
    handleUploadGarment();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    tabsContainer: {
      flexDirection: 'row',
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 8,
      padding: 3,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      width: 168,
    },
    tab: {
      flex: 1,
      paddingVertical: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
    },
    tabActive: {
      backgroundColor: theme.colors.surface,
    },
    tabIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabIconWrapActive: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    tabIcon: {
      fontSize: 17,
      color: theme.colors.textSecondary,
    },
    tabIconActive: {
      color: theme.colors.tint,
    },
    // Empty State - Premium Wardrobe
    emptyWardrobeContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 40,
    },
    emptyPhotoCard: {
      width: SCREEN_WIDTH * 0.76,
      height: SCREEN_WIDTH * 0.92,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 22,
      backgroundColor: theme.colors.surfaceMuted,
    },
    emptyPhoto: {
      width: '100%',
      height: '100%',
    },
    emptyPhotoOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 120,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    emptyWardrobeText: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 6,
      textAlign: 'center',
    },
    emptyWardrobeSubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 18,
      lineHeight: 20,
      maxWidth: 320,
    },
    emptyActionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    addItemButton: {
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      minWidth: 136,
      alignItems: 'center',
    },
    addItemButtonPrimary: {
      backgroundColor: theme.colors.tint,
      borderColor: theme.colors.tint,
    },
    addItemButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    addItemButtonTextPrimary: {
      color: theme.mode === 'dark' ? '#0f172a' : '#ffffff',
    },
    filterSection: {
      paddingTop: 10,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    filterLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      paddingHorizontal: SIDE_PADDING,
      marginBottom: 8,
    },
    filterScroll: {
      paddingHorizontal: SIDE_PADDING,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipActive: {
      backgroundColor: theme.colors.tint,
      borderColor: theme.colors.tint,
    },
    filterChipText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: '500',
      textTransform: 'capitalize',
    },
    filterChipTextActive: {
      color: theme.mode === 'dark' ? '#0f172a' : '#ffffff',
      fontWeight: '700',
    },
    gridContainer: {
      paddingHorizontal: SIDE_PADDING,
      paddingTop: 16,
      paddingBottom: 100,
    },
    row: {
      justifyContent: 'flex-start',
      gap: ITEM_SPACING,
      marginBottom: ITEM_SPACING,
    },
    itemContainer: {
      width: ITEM_WIDTH,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      overflow: 'hidden',
    },
    itemImage: {
      width: ITEM_WIDTH,
      height: ITEM_WIDTH * 1.4,
      backgroundColor: theme.colors.surfaceElevated,
    },
    placeholderImage: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textTertiary,
      letterSpacing: 0.2,
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
      marginTop: 4,
      fontSize: 10,
      fontWeight: '600',
    },
    categoryBadge: {
      position: 'absolute',
      top: 6,
      left: 6,
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    categoryBadgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    colorIndicator: {
      position: 'absolute',
      bottom: 6,
      right: 6,
    },
    colorDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#fff',
    },
    removeButton: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    itemName: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    itemPrice: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.tint,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    fabText: {
      color: theme.mode === 'dark' ? '#0f172a' : '#ffffff',
      fontSize: 28,
      fontWeight: '300',
      lineHeight: 28,
    },
    actionSheetOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(8, 12, 18, 0.52)',
      zIndex: 1000,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionSheetContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      width: SCREEN_WIDTH - 52,
      maxWidth: 360,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 12,
      zIndex: 1001,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionSheetTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 14,
      textAlign: 'center',
    },
    actionSheetButton: {
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: 12,
      paddingVertical: 13,
      paddingHorizontal: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionSheetButtonPrimary: {
      backgroundColor: theme.colors.tint,
      borderColor: theme.colors.tint,
    },
    actionSheetButtonIcon: {
      fontSize: 21,
      color: theme.colors.textPrimary,
    },
    actionSheetButtonIconPrimary: {
      color: theme.mode === 'dark' ? '#0f172a' : '#ffffff',
    },
    actionSheetButtonText: {
      color: theme.colors.textSecondary,
    },
    actionSheetButtonTextPrimary: {
      color: theme.mode === 'dark' ? '#0f172a' : '#ffffff',
    },
    actionSheetCancel: {
      marginTop: 2,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    outfitCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    outfitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    outfitTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textTransform: 'capitalize',
    },
    outfitMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    outfitGarmentsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    outfitCover: {
      width: '100%',
      aspectRatio: 0.78,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
    },
    outfitGarmentThumb: {
      width: 80,
      height: 100,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted,
    },
  });

  const renderSavedItem = ({ item }: { item: WardrobeItem }) => {
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
          onPress={() => handleRemoveSavedItem(item.id)}
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

  const renderMyGarment = ({ item }: { item: UserGarment }) => {
    const imageUrl = item.thumbnailUrl || item.processedUrl || item.originalUrl;
    const isProcessing = item.status === 'processing';

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => handleViewGarmentDetail(item.id)}
        disabled={isProcessing}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <View style={[styles.itemImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>No Photo</Text>
          </View>
        )}

        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.processingText}>Processing...</Text>
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
  };

  const renderEmptyMyGarments = () => (
    <View style={styles.emptyWardrobeContainer}>
      <View style={styles.emptyPhotoCard}>
        <Image source={{ uri: EMPTY_WARDROBE_PHOTO }} style={styles.emptyPhoto} resizeMode="cover" />
        <View style={styles.emptyPhotoOverlay} />
      </View>
      <Text style={styles.emptyWardrobeText}>Your Wardrobe is Empty</Text>
      <Text style={styles.emptyWardrobeSubtext}>
        Build your digital closet with high-quality pieces that represent your style.
      </Text>
    </View>
  );

  const renderEmptySavedItems = () => (
    <View style={styles.emptyWardrobeContainer}>
      <View style={styles.emptyPhotoCard}>
        <Image source={{ uri: EMPTY_WARDROBE_PHOTO }} style={styles.emptyPhoto} resizeMode="cover" />
        <View style={styles.emptyPhotoOverlay} />
      </View>
      <Text style={styles.emptyWardrobeText}>No Saved Items Yet</Text>
      <Text style={styles.emptyWardrobeSubtext}>
        Save items from Explore and they will appear here for easy styling later.
      </Text>
    </View>
  );

  const renderEmptyOutfits = () => (
    <View style={styles.emptyWardrobeContainer}>
      <View style={styles.emptyPhotoCard}>
        <Image source={{ uri: EMPTY_WARDROBE_PHOTO }} style={styles.emptyPhoto} resizeMode="cover" />
        <View style={styles.emptyPhotoOverlay} />
      </View>
      <Text style={styles.emptyWardrobeText}>No Outfits Created</Text>
      <Text style={styles.emptyWardrobeSubtext}>
        Create complete looks from your wardrobe and save them for quick styling.
      </Text>
    </View>
  );

  const categories = activeTab === 'my-garments'
    ? ['All', ...garmentCategories]
    : ['All', ...availableCategories];
  const colors = ['All', ...availableColors];

  const loading = activeTab === 'my-garments' ? myGarmentsLoading
    : activeTab === 'my-outfits' ? outfitsLoading
    : savedItemsLoading;

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-garments' && styles.tabActive]}
          onPress={() => setActiveTab('my-garments')}
        >
          <View style={[styles.tabIconWrap, activeTab === 'my-garments' && styles.tabIconWrapActive]}>
            <LineIcon
              name="wardrobe"
              size={18}
              style={[styles.tabIcon, activeTab === 'my-garments' && styles.tabIconActive]}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-outfits' && styles.tabActive]}
          onPress={() => setActiveTab('my-outfits')}
        >
          <View style={[styles.tabIconWrap, activeTab === 'my-outfits' && styles.tabIconWrapActive]}>
            <LineIcon
              name="spark"
              size={18}
              style={[styles.tabIcon, activeTab === 'my-outfits' && styles.tabIconActive]}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved-items' && styles.tabActive]}
          onPress={() => setActiveTab('saved-items')}
        >
          <View style={[styles.tabIconWrap, activeTab === 'saved-items' && styles.tabIconWrapActive]}>
            <LineIcon
              name="bookmark"
              size={18}
              style={[styles.tabIcon, activeTab === 'saved-items' && styles.tabIconActive]}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      {activeTab !== 'my-outfits' && categories.length > 1 && (
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

      {/* Color Filter - Only for saved items */}
      {activeTab === 'saved-items' && colors.length > 1 && (
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

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
        </View>
      ) : activeTab === 'my-garments' ? (
        myGarments.length === 0 ? (
          renderEmptyMyGarments()
        ) : (
          <FlatList
            key={`wardrobe-my-garments-${NUM_COLUMNS}`}
            data={myGarments}
            renderItem={renderMyGarment}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.tint}
              />
            }
          />
        )
      ) : activeTab === 'my-outfits' ? (
        savedOutfits.length === 0 ? (
          renderEmptyOutfits()
        ) : (
          <View style={styles.centered}>
            <OutfitSwipeDeck
              outfits={savedOutfits}
              currentIndex={outfitSwipeIndex}
              onIndexChange={setOutfitSwipeIndex}
              theme={theme}
            />
          </View>
        )
      ) : (
        savedItems.length === 0 ? (
          renderEmptySavedItems()
        ) : (
          <FlatList
            key={`wardrobe-saved-items-${NUM_COLUMNS}`}
            data={savedItems}
            renderItem={renderSavedItem}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.tint}
              />
            }
          />
        )
      )}

      <TouchableOpacity style={styles.fab} onPress={handleOpenActionSheet} activeOpacity={0.88}>
        <LineIcon
          name="plus"
          size={30}
          color={theme.mode === 'dark' ? '#0f172a' : '#ffffff'}
          style={styles.fabText}
        />
      </TouchableOpacity>

      <Modal
        visible={showActionSheet}
        transparent
        animationType="fade"
        onRequestClose={handleCloseActionSheet}
      >
        <View style={styles.actionSheetOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleCloseActionSheet} />
          <View style={styles.actionSheetContent}>
            <Text style={styles.actionSheetTitle}>＋</Text>

            <TouchableOpacity
              style={[styles.actionSheetButton, styles.actionSheetButtonPrimary]}
              onPress={handleAddClothes}
              activeOpacity={0.88}
            >
              <LineIcon
                name="wardrobe"
                size={22}
                style={[styles.actionSheetButtonIcon, styles.actionSheetButtonIconPrimary]}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionSheetButton} onPress={handleCreateOutfit} activeOpacity={0.88}>
              <LineIcon name="spark" size={22} style={styles.actionSheetButtonIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionSheetButton, styles.actionSheetCancel]}
              onPress={handleCloseActionSheet}
              activeOpacity={0.88}
            >
              <LineIcon
                name="close"
                size={22}
                style={[styles.actionSheetButtonIcon, styles.actionSheetButtonText]}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

interface OutfitSwipeDeckProps {
  outfits: CreatedOutfit[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  theme: AppTheme;
}

function OutfitSwipeDeck({ outfits, currentIndex, onIndexChange, theme }: OutfitSwipeDeckProps) {
  const cardWidth = SCREEN_WIDTH - SIDE_PADDING * 2 - 12;
  const cardHeight = Math.round(cardWidth * 1.28);
  const swipeThreshold = cardWidth * 0.22;
  const swipeExitDistance = cardWidth * 1.1;

  const current = outfits[normalizeLoopIndex(currentIndex, outfits.length)];
  const next = outfits[normalizeLoopIndex(currentIndex + 1, outfits.length)];
  const previous = outfits[normalizeLoopIndex(currentIndex - 1, outfits.length)];

  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  const deckStyles = useMemo(() => createDeckStyles(theme, cardHeight), [cardHeight, theme]);

  const finalizeSwipe = useCallback(
    (direction: 1 | -1) => {
      onIndexChange(normalizeLoopIndex(currentIndex + direction, outfits.length));
    },
    [currentIndex, onIndexChange, outfits.length],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .onUpdate((event) => {
          if (isAnimating.value) return;
          translateX.value = event.translationX;
        })
        .onEnd((event) => {
          if (isAnimating.value) return;

          const distance = Math.abs(translateX.value);
          const velocity = Math.abs(event.velocityX);
          const shouldAdvance = distance > swipeThreshold || velocity > 850;

          if (!shouldAdvance) {
            translateX.value = withTiming(0, {
              duration: 360,
              easing: Easing.bezier(0.22, 1, 0.36, 1),
            });
            return;
          }

          const swipeLeft = translateX.value < 0;
          const exitDirection = swipeLeft ? -1 : 1;
          const indexDirection = swipeLeft ? 1 : -1;

          isAnimating.value = true;
          translateX.value = withTiming(
            exitDirection * swipeExitDistance,
            {
              duration: 300,
              easing: Easing.bezier(0.22, 1, 0.36, 1),
            },
            (finished) => {
              if (finished) {
                runOnJS(finalizeSwipe)(indexDirection as 1 | -1);
                translateX.value = 0;
              }
              isAnimating.value = false;
            },
          );
        }),
    [finalizeSwipe, isAnimating, swipeExitDistance, swipeThreshold, translateX],
  );

  const activeCardStyle = useAnimatedStyle(() => {
    const rotation = interpolate(translateX.value, [-swipeExitDistance, 0, swipeExitDistance], [-8, 0, 8]);
    const motion = Math.min(1, Math.abs(translateX.value) / swipeExitDistance);
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotation}deg` },
        { scale: 1 - motion * 0.03 },
      ],
    };
  });

  const nextCardStyle = useAnimatedStyle(() => {
    const reveal = clamp01(-translateX.value / swipeThreshold);
    return {
      opacity: 0.42 + reveal * 0.58,
      transform: [{ scale: 0.93 + reveal * 0.07 }, { translateY: 12 - reveal * 12 }],
    };
  });

  const previousCardStyle = useAnimatedStyle(() => {
    const reveal = clamp01(translateX.value / swipeThreshold);
    return {
      opacity: 0.42 + reveal * 0.58,
      transform: [{ scale: 0.93 + reveal * 0.07 }, { translateY: 12 - reveal * 12 }],
    };
  });

  return (
    <View style={deckStyles.wrapper}>
      <View style={deckStyles.stage}>
        <Animated.View pointerEvents="none" style={[deckStyles.cardLayer, previousCardStyle]}>
          <OutfitSwipeCard outfit={previous} theme={theme} cardHeight={cardHeight} />
        </Animated.View>

        <Animated.View pointerEvents="none" style={[deckStyles.cardLayer, nextCardStyle]}>
          <OutfitSwipeCard outfit={next} theme={theme} cardHeight={cardHeight} />
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[deckStyles.cardLayer, activeCardStyle]}>
            <OutfitSwipeCard outfit={current} theme={theme} cardHeight={cardHeight} />
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={deckStyles.footer}>
        <Text style={deckStyles.counter}>
          {normalizeLoopIndex(currentIndex, outfits.length) + 1} / {outfits.length}
        </Text>
        <Text style={deckStyles.hint}>‹ swipe ›</Text>
      </View>
    </View>
  );
}

interface OutfitSwipeCardProps {
  outfit: CreatedOutfit;
  theme: AppTheme;
  cardHeight: number;
}

function OutfitSwipeCard({ outfit, theme, cardHeight }: OutfitSwipeCardProps) {
  const itemCount = outfit.itemCount ?? outfit.items?.length ?? 0;
  const previewItems = (outfit.items || []).slice(0, 4);
  const cardStyles = useMemo(() => createDeckCardStyles(theme, cardHeight), [cardHeight, theme]);

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <Text style={cardStyles.title} numberOfLines={1}>
          {outfit.name || 'Outfit'}
        </Text>
        <Text style={cardStyles.meta}>{itemCount} items</Text>
      </View>

      {outfit.coverImageUrl ? (
        <Image source={{ uri: outfit.coverImageUrl }} style={cardStyles.cover} resizeMode="cover" />
      ) : previewItems.length > 0 ? (
        <View style={cardStyles.previewGrid}>
          {previewItems.map((item) => (
            <Image key={item.id} source={{ uri: item.imageCutoutUrl }} style={cardStyles.previewThumb} resizeMode="cover" />
          ))}
        </View>
      ) : (
        <View style={cardStyles.placeholder}>
          <LineIcon name="spark" size={28} color={theme.colors.textTertiary} />
        </View>
      )}
    </View>
  );
}

function createDeckStyles(theme: AppTheme, cardHeight: number) {
  return StyleSheet.create({
    wrapper: {
      width: '100%',
      alignItems: 'center',
    },
    stage: {
      width: SCREEN_WIDTH - SIDE_PADDING * 2,
      height: cardHeight + 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardLayer: {
      position: 'absolute',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    counter: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    hint: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
  });
}

function createDeckCardStyles(theme: AppTheme, cardHeight: number) {
  return StyleSheet.create({
    card: {
      width: SCREEN_WIDTH - SIDE_PADDING * 2 - 12,
      height: cardHeight,
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: theme.mode === 'dark' ? 0.2 : 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    title: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textTransform: 'capitalize',
      marginRight: 8,
    },
    meta: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    cover: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
    },
    previewGrid: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 8,
    },
    previewThumb: {
      width: '48.5%',
      height: '48%',
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceMuted,
    },
    placeholder: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

function normalizeLoopIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function clamp01(value: number): number {
  'worklet';
  return Math.max(0, Math.min(1, value));
}
