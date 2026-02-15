import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  RefreshControl,
  Modal,
  Pressable,
  Alert,
  Share,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CreatedOutfit, WardrobeItem } from '@fashion/shared';
import { api, type WardrobeWorthResponse } from '../../services/api';
import { RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme';
import { LineIcon } from '../../components/LineIcon';
import { WardrobeHeaderTabs, WardrobeHeaderTab } from '../../components/WardrobeHeaderTabs';
import { OutfitCanvas } from '../../outfit/OutfitCanvas';
import {
  defaultAspectRatioForCategory,
  normalizeClothingCategory,
  type ClothingItem,
} from '../../outfit/types';
import {
  createEmptyWardrobeAssetsByCategory,
  PremiumWardrobeSections,
  syncRemoteGarmentsToLocal,
  type WardrobeAsset,
  type WardrobeAssetsByCategory,
  wardrobeAssetRepository,
} from '../../wardrobe';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SPACING = 12;
const SIDE_PADDING = 16;
const NUM_COLUMNS = 3;
const ITEM_WIDTH = (SCREEN_WIDTH - SIDE_PADDING * 2 - ITEM_SPACING * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const OUTFIT_CARD_WIDTH = SCREEN_WIDTH - SIDE_PADDING * 2;
const OUTFIT_SNAP_INTERVAL = OUTFIT_CARD_WIDTH + ITEM_SPACING;
const EMPTY_ART_SIZE = Math.min(SCREEN_WIDTH * 0.62, 280);
const EMPTY_WARDROBE_ASSET = require('../../../assets/empty-wardrobe.png');

type TabType = WardrobeHeaderTab;
type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function WardrobeScreen() {
  const navigation = useNavigation<RootNav>();
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<TabType>('uploaded');

  // Saved items from posts
  const [savedItems, setSavedItems] = useState<WardrobeItem[]>([]);
  const [savedItemsLoading, setSavedItemsLoading] = useState(true);
  const [savedOutfits, setSavedOutfits] = useState<CreatedOutfit[]>([]);
  const [savedOutfitsLoading, setSavedOutfitsLoading] = useState(true);

  // Local premium wardrobe assets
  const [localWardrobe, setLocalWardrobe] = useState<WardrobeAssetsByCategory>(
    createEmptyWardrobeAssetsByCategory(),
  );
  const [localWardrobeLoading, setLocalWardrobeLoading] = useState(true);
  const [wearWorth, setWearWorth] = useState<WardrobeWorthResponse | null>(null);
  const [wearWorthLoading, setWearWorthLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedColor, setSelectedColor] = useState('All');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [creatingRandomOutfit, setCreatingRandomOutfit] = useState(false);
  const outfitScrollX = useRef(new Animated.Value(0)).current;

  // Reload data when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[WardrobeScreen] Tab focused, reloading data');
      loadAllData();
    }, [selectedCategory, selectedColor, activeTab])
  );

  const loadAllData = async () => {
    await loadWearsWorth();
    if (activeTab === 'uploaded') {
      await loadLocalWardrobeAssets();
    } else if (activeTab === 'saved') {
      await loadFilters();
      await loadSavedItems();
    } else {
      await loadSavedOutfits();
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

  const loadWearsWorth = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setWearWorthLoading(true);
      }
      const value = await api.getWardrobeWorth();
      setWearWorth(value);
    } catch (error) {
      console.error('Failed to load wardrobe worth:', error);
    } finally {
      setWearWorthLoading(false);
    }
  };

  const loadLocalWardrobeAssets = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLocalWardrobeLoading(true);
      }
      await syncRemoteGarmentsToLocal({ limit: 240 });
      const grouped = await wardrobeAssetRepository.listByCategory();
      setLocalWardrobe(grouped);
      const total = Object.values(grouped).reduce((count, items) => count + items.length, 0);
      console.log(`[WardrobeScreen] Loaded ${total} local wardrobe assets`);
    } catch (error) {
      console.error('Failed to load local wardrobe assets:', error);
    } finally {
      setLocalWardrobeLoading(false);
      setRefreshing(false);
    }
  };

  const loadSavedOutfits = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setSavedOutfitsLoading(true);
      }
      const response = await api.listSavedOutfits();
      const hydrated = await Promise.all(
        response.outfits.map(async (outfit) => {
          if (Array.isArray(outfit.items) && outfit.items.length > 0) {
            return outfit;
          }
          try {
            return await api.getOutfit(outfit.id);
          } catch (error) {
            console.warn(`[WardrobeScreen] Failed to hydrate outfit ${outfit.id}`, error);
            return outfit;
          }
        }),
      );
      setSavedOutfits(hydrated);
      console.log(`[WardrobeScreen] Loaded ${hydrated.length} outfits`);
    } catch (error) {
      console.error('Failed to load outfits:', error);
    } finally {
      setSavedOutfitsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedCategory, selectedColor, activeTab]);

  const handleRefresh = () => {
    if (activeTab === 'uploaded') {
      loadLocalWardrobeAssets(true);
      loadWearsWorth(true);
    } else if (activeTab === 'saved') {
      loadFilters();
      loadSavedItems(true);
      loadWearsWorth(true);
    } else {
      loadSavedOutfits(true);
      loadWearsWorth(true);
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
      await Promise.all([loadFilters(), loadWearsWorth(true)]);
    } catch (error) {
      console.error('Failed to remove item:', error);
      loadSavedItems();
    }
  };

  const handleDeleteWardrobeAsset = (asset: WardrobeAsset) => {
    Alert.alert(
      'Delete Item',
      'Remove this clothing item from your wardrobe?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await wardrobeAssetRepository.deleteById(asset.id);
              if (asset.sourceGarmentId) {
                try {
                  await api.deleteUserGarment(asset.sourceGarmentId);
                } catch (deleteRemoteError) {
                  console.warn('[WardrobeScreen] Failed to delete remote garment', deleteRemoteError);
                }
              }
              await Promise.all([loadLocalWardrobeAssets(), loadWearsWorth(true)]);
            } catch (error) {
              console.error('Failed to delete wardrobe item:', error);
              Alert.alert('Error', 'Failed to delete this item');
            }
          },
        },
      ],
    );
  };

  const handleOpenSavedModel = (postId: string) => {
    navigation.navigate('PostDetail', { postId });
  };

  const handleDownloadModelPhoto = async (imageUrl: string) => {
    try {
      await Share.share({
        message: imageUrl,
        url: imageUrl,
      });
    } catch (error) {
      console.error('Failed to share model photo:', error);
      Alert.alert('Error', 'Could not open download/share options');
    }
  };

  const handleDeleteOutfit = (outfitId: string) => {
    Alert.alert(
      'Delete Outfit',
      'Remove this outfit from your saved outfits?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteOutfit(outfitId);
              setSavedOutfits((prev) => prev.filter((outfit) => outfit.id !== outfitId));
            } catch (error) {
              console.error('Failed to delete outfit:', error);
              Alert.alert('Error', 'Failed to delete outfit');
            }
          },
        },
      ],
    );
  };

  const handleGenerateRandomOutfit = async () => {
    if (creatingRandomOutfit) return;

    try {
      setCreatingRandomOutfit(true);
      const response = await api.generateRandomOutfit();
      const created = response.outfit;
      setSavedOutfits((previous) => [created, ...previous.filter((outfit) => outfit.id !== created.id)]);
      setActiveTab('outfits');
      Alert.alert('Outfit Created', 'A random outfit was generated from your wardrobe.');
    } catch (error: any) {
      console.error('Failed to generate random outfit:', error);
      Alert.alert(
        'Could Not Create Outfit',
        error?.message ||
          'Add more pieces (top, bottom, shoes or one-piece + shoes) and try again.',
      );
    } finally {
      setCreatingRandomOutfit(false);
    }
  };

  const handleUploadGarment = () => {
    navigation.navigate('UploadGarment');
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
    emptyWardrobeContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
      paddingVertical: 56,
    },
    emptyPhotoCard: {
      width: EMPTY_ART_SIZE,
      height: EMPTY_ART_SIZE,
      marginBottom: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyPhoto: {
      width: '100%',
      height: '100%',
      tintColor: theme.colors.textTertiary,
      opacity: theme.mode === 'dark' ? 0.9 : 0.82,
    },
    emptyWardrobeText: {
      fontSize: 22,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyWardrobeSubtext: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 332,
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
    downloadButton: {
      position: 'absolute',
      left: 6,
      bottom: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    downloadButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
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
    outfitsListContainer: {
      paddingHorizontal: SIDE_PADDING,
      paddingTop: 12,
      paddingBottom: 120,
    },
    outfitsHorizontalListContainer: {
      paddingHorizontal: SIDE_PADDING,
      paddingTop: 12,
      paddingBottom: 120,
    },
    outfitCardWrapper: {
      width: OUTFIT_CARD_WIDTH,
      marginRight: ITEM_SPACING,
      paddingVertical: 4,
    },
    outfitCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: theme.mode === 'dark' ? 0.34 : 0.14,
      shadowRadius: 22,
      elevation: 9,
    },
    outfitCanvasWrap: {
      height: 420,
      padding: 12,
      backgroundColor: theme.colors.surfaceMuted,
    },
    outfitFallbackWrap: {
      padding: 12,
      backgroundColor: theme.colors.surfaceMuted,
    },
    outfitFooter: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
      minHeight: 82,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
    },
    outfitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 36,
    },
    outfitMetaBlock: {
      flex: 1,
      paddingRight: 12,
    },
    outfitTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textTransform: 'capitalize',
    },
    outfitMeta: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    outfitGarmentsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    outfitCover: {
      width: '100%',
      aspectRatio: 0.92,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
    },
    outfitGarmentThumb: {
      width: 80,
      height: 100,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted,
    },
    worthCard: {
      marginHorizontal: SIDE_PADDING,
      marginTop: 8,
      marginBottom: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 10,
    },
    worthHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    worthLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    worthAmount: {
      fontSize: 30,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      letterSpacing: 0.2,
    },
    worthMeta: {
      marginTop: 2,
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    randomOutfitSection: {
      paddingHorizontal: SIDE_PADDING,
      paddingTop: 8,
      paddingBottom: 6,
    },
    randomOutfitButton: {
      minHeight: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 14,
    },
    randomOutfitButtonDisabled: {
      opacity: 0.7,
    },
    randomOutfitButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    outfitDeleteButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  const renderSavedItem = ({ item }: { item: WardrobeItem }) => {
    const imageUrl = item.clothingItem.post.imageUrls[item.clothingItem.imageIndex];

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => handleOpenSavedModel(item.clothingItem.postId)}
        activeOpacity={0.9}
      >
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
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => handleDownloadModelPhoto(imageUrl)}
        >
          <Text style={styles.downloadButtonText}>↓</Text>
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
      </TouchableOpacity>
    );
  };

  const renderEmptyMyGarments = () => (
    <View style={styles.emptyWardrobeContainer}>
      <View style={styles.emptyPhotoCard}>
        <Image source={EMPTY_WARDROBE_ASSET} style={styles.emptyPhoto} resizeMode="contain" />
      </View>
      <Text style={styles.emptyWardrobeText}>Your wardrobe is empty</Text>
      <Text style={styles.emptyWardrobeSubtext}>
        Add your first item to start styling outfits.
      </Text>
    </View>
  );

  const renderEmptySavedItems = () => (
    <View style={styles.emptyWardrobeContainer}>
      <View style={styles.emptyPhotoCard}>
        <Image source={EMPTY_WARDROBE_ASSET} style={styles.emptyPhoto} resizeMode="contain" />
      </View>
      <Text style={styles.emptyWardrobeText}>No saved pieces yet</Text>
      <Text style={styles.emptyWardrobeSubtext}>
        Save looks from Explore and they will appear here.
      </Text>
    </View>
  );

  const renderEmptyOutfits = () => (
    <View style={styles.emptyWardrobeContainer}>
      <View style={styles.emptyPhotoCard}>
        <Image source={EMPTY_WARDROBE_ASSET} style={styles.emptyPhoto} resizeMode="contain" />
      </View>
      <Text style={styles.emptyWardrobeText}>No outfits yet</Text>
      <Text style={styles.emptyWardrobeSubtext}>
        Create and save an outfit to see it here.
      </Text>
    </View>
  );

  const renderSavedOutfit = ({ item, index }: { item: CreatedOutfit; index: number }) => {
    const previewUrl =
      item.coverImageUrl ||
      item.items?.[0]?.imageCutoutUrl ||
      item.items?.[0]?.imageOriginalUrl ||
      null;
    const outfitItemCount = item.itemCount ?? item.items?.length ?? 0;
    const canvasItems: ClothingItem[] = (item.items || []).map((outfitItem) => {
      const category = normalizeClothingCategory(outfitItem.category || undefined);
      return {
        id: outfitItem.id,
        imageUri: outfitItem.imageCutoutUrl || outfitItem.imageOriginalUrl,
        category,
        aspectRatio: defaultAspectRatioForCategory(category),
      };
    });

    const inputRange = [
      (index - 1) * OUTFIT_SNAP_INTERVAL,
      index * OUTFIT_SNAP_INTERVAL,
      (index + 1) * OUTFIT_SNAP_INTERVAL,
    ];

    const scale = outfitScrollX.interpolate({
      inputRange,
      outputRange: [0.93, 1, 0.93],
      extrapolate: 'clamp',
    });

    const translateY = outfitScrollX.interpolate({
      inputRange,
      outputRange: [10, 0, 10],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.outfitCardWrapper, { transform: [{ scale }, { translateY }] }]}>
        <View style={styles.outfitCard}>
          {canvasItems.length > 0 ? (
            <View style={styles.outfitCanvasWrap}>
              <OutfitCanvas items={canvasItems} />
            </View>
          ) : previewUrl ? (
            <View style={styles.outfitFallbackWrap}>
              <Image source={{ uri: previewUrl }} style={styles.outfitCover} resizeMode="cover" />
            </View>
          ) : (
            <View style={[styles.outfitCanvasWrap, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>No Preview</Text>
            </View>
          )}
          <View style={styles.outfitFooter}>
            <View style={styles.outfitHeader}>
              <View style={styles.outfitMetaBlock}>
                <Text style={styles.outfitTitle} numberOfLines={1}>
                  {item.name?.trim() || 'Untitled Outfit'}
                </Text>
                <Text style={styles.outfitMeta}>
                  {outfitItemCount} {outfitItemCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.outfitDeleteButton}
                onPress={() => handleDeleteOutfit(item.id)}
                activeOpacity={0.88}
              >
                <LineIcon name="trash" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const categories = activeTab === 'saved' ? ['All', ...availableCategories] : [];
  const colors = ['All', ...availableColors];
  const localWardrobeCount = Object.values(localWardrobe).reduce((count, items) => count + items.length, 0);
  const wearsWorthAmount = wearWorth?.totalValue ?? 0;
  const wearsWorthValueText = wearWorthLoading ? '...' : formatCurrency(wearsWorthAmount);
  const wearsWorthMeta = wearWorth
    ? `${wearWorth.pricedItems} priced ${wearWorth.pricedItems === 1 ? 'item' : 'items'} • ${wearWorth.totalItems} total saved items`
    : 'No priced saved items yet';

  const loading = activeTab === 'uploaded'
    ? localWardrobeLoading
    : activeTab === 'saved'
      ? savedItemsLoading
      : savedOutfitsLoading;

  return (
    <View style={styles.container}>
      <WardrobeHeaderTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <View style={styles.worthCard}>
        <View style={styles.worthHeaderRow}>
          <Text style={styles.worthLabel}>Your Wears Worth</Text>
          {wearWorthLoading ? <ActivityIndicator size="small" color={theme.colors.tint} /> : null}
        </View>
        <Text style={styles.worthAmount}>{wearsWorthValueText}</Text>
        <Text style={styles.worthMeta}>{wearsWorthMeta}</Text>
      </View>

      {/* Category Filter */}
      {activeTab === 'saved' && categories.length > 1 && (
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
      {activeTab === 'saved' && colors.length > 1 && (
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

      {activeTab === 'outfits' && (
        <View style={styles.randomOutfitSection}>
          <TouchableOpacity
            style={[
              styles.randomOutfitButton,
              creatingRandomOutfit && styles.randomOutfitButtonDisabled,
            ]}
            onPress={handleGenerateRandomOutfit}
            disabled={creatingRandomOutfit}
            activeOpacity={0.9}
          >
            {creatingRandomOutfit ? (
              <ActivityIndicator size="small" color={theme.colors.tint} />
            ) : (
              <LineIcon name="spark" size={18} color={theme.colors.tint} />
            )}
            <Text style={styles.randomOutfitButtonText}>
              {creatingRandomOutfit ? 'Generating Outfit...' : 'Generate Random Outfit'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
        </View>
      ) : activeTab === 'uploaded' ? (
        localWardrobeCount === 0 ? (
          renderEmptyMyGarments()
        ) : (
          <PremiumWardrobeSections
            groupedAssets={localWardrobe}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onAddPress={() => handleUploadGarment()}
            onDeleteAsset={handleDeleteWardrobeAsset}
          />
        )
      ) : activeTab === 'saved' ? (
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
      ) : (
        savedOutfits.length === 0 ? (
          renderEmptyOutfits()
        ) : (
          <Animated.FlatList
            key="wardrobe-saved-outfits-horizontal"
            data={savedOutfits}
            renderItem={renderSavedOutfit}
            keyExtractor={(item) => item.id}
            horizontal
            snapToInterval={OUTFIT_SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            bounces={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.outfitsHorizontalListContainer}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: outfitScrollX } } }],
              { useNativeDriver: true },
            )}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({
              length: OUTFIT_SNAP_INTERVAL,
              offset: OUTFIT_SNAP_INTERVAL * index,
              index,
            })}
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
