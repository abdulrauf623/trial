import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { api } from '../services/api';
import { Post, ClothingItem } from '@fashion/shared';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

export function PostDetailScreen({ route }: Props) {
  const { postId } = route.params;
  const { width } = useWindowDimensions();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showTaggedItems, setShowTaggedItems] = useState(false);

  useEffect(() => {
    loadPost();
    trackView();
  }, [postId]);

  useEffect(() => {
    if (post) {
      setIsSaved(post.isSavedByMe || false);
    }
  }, [post]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const data = await api.getPost(postId);
      setPost(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      await api.trackEvent({
        eventName: 'post_viewed',
        properties: { postId },
      });
    } catch (err) {
      console.error('Failed to track view:', err);
    }
  };

  const handleSave = async () => {
    if (!post) return;

    try {
      if (isSaved) {
        await api.unsavePost(post.id);
        setIsSaved(false);
        await api.trackEvent({
          eventName: 'post_unsaved',
          properties: { postId: post.id },
        });
      } else {
        await api.savePost(post.id);
        setIsSaved(true);
        await api.trackEvent({
          eventName: 'post_saved',
          properties: { postId: post.id },
        });

        // Show success message
        const itemCount = post.clothingItems?.length || 0;
        if (itemCount > 0) {
          Alert.alert(
            'Saved!',
            `Post saved and ${itemCount} item${itemCount !== 1 ? 's' : ''} added to your wardrobe.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (err) {
      console.error('Failed to save/unsave post:', err);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    }
  };

  const handleLike = async () => {
    if (!post) return;

    try {
      const newLikedState = !post.isLikedByMe;
      setPost({
        ...post,
        isLikedByMe: newLikedState,
        likeCount: post.likeCount + (newLikedState ? 1 : -1),
      });

      if (newLikedState) {
        await api.likePost(post.id);
      } else {
        await api.unlikePost(post.id);
      }
    } catch (err) {
      console.error('Failed to like/unlike:', err);
      setPost({
        ...post,
        isLikedByMe: !post.isLikedByMe,
        likeCount: post.likeCount + (post.isLikedByMe ? 1 : -1),
      });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentImageIndex(index);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Post not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadPost}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const itemsForCurrentImage = post.clothingItems?.filter(
    (item) => item.imageIndex === currentImageIndex
  ) || [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {post.imageUrls.map((url, index) => (
              <Image
                key={index}
                source={{ uri: url }}
                style={{ width, height: width * 1.2 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Pagination Dots */}
          {post.imageUrls.length > 1 && (
            <View style={styles.paginationContainer}>
              {post.imageUrls.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentImageIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Tagged Items Button */}
          {itemsForCurrentImage.length > 0 && (
            <TouchableOpacity
              style={styles.taggedButton}
              onPress={() => setShowTaggedItems(!showTaggedItems)}
            >
              <Text style={styles.taggedButtonText}>
                🏷️ {itemsForCurrentImage.length} item{itemsForCurrentImage.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Post Info */}
        <View style={styles.infoContainer}>
          {/* Creator */}
          <View style={styles.creatorRow}>
            <Image
              source={{ uri: post.creator.avatarUrl || 'https://via.placeholder.com/40' }}
              style={styles.avatar}
            />
            <Text style={styles.creatorName}>{post.creator.displayName}</Text>
            {post.creator.accountType === 'creator' && (
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>Creator</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Text style={styles.actionIcon}>{post.isLikedByMe ? '❤️' : '🤍'}</Text>
              <Text style={styles.actionText}>{post.likeCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
              <Text style={styles.actionIcon}>{isSaved ? '🔖' : '📑'}</Text>
              <Text style={styles.actionText}>{isSaved ? 'Saved' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          {/* Caption */}
          {post.caption && (
            <Text style={styles.caption}>{post.caption}</Text>
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {post.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Tagged Items List */}
        {showTaggedItems && itemsForCurrentImage.length > 0 && (
          <View style={styles.taggedItemsContainer}>
            <Text style={styles.taggedItemsTitle}>Tagged Items</Text>
            {itemsForCurrentImage.map((item) => (
              <TaggedItemCard key={item.id} item={item} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TaggedItemCard({ item }: { item: ClothingItem }) {
  const [addedToWardrobe, setAddedToWardrobe] = useState(false);

  const handleAddToWardrobe = async () => {
    try {
      await api.addToWardrobe(item.id);
      setAddedToWardrobe(true);
      await api.trackEvent({
        eventName: 'item_added_to_wardrobe',
        properties: { clothingItemId: item.id, category: item.category },
      });
    } catch (err) {
      console.error('Failed to add to wardrobe:', err);
    }
  };

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
        {item.name && <Text style={styles.itemName}>{item.name}</Text>}
        {item.category && <Text style={styles.itemCategory}>{item.category}</Text>}
        {item.price && <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>}
        {item.color && (
          <Text style={styles.itemDetail}>Color: {item.color}</Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.addButton, addedToWardrobe && styles.addButtonDisabled]}
        onPress={handleAddToWardrobe}
        disabled={addedToWardrobe}
      >
        <Text style={styles.addButtonText}>
          {addedToWardrobe ? '✓ Added' : '+ Add to Wardrobe'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  taggedButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  taggedButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 16,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  brandBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  brandBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  caption: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#666',
  },
  taggedItemsContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  taggedItemsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemInfo: {
    marginBottom: 12,
  },
  itemBrand: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 13,
    color: '#666',
  },
  addButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
