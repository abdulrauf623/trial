import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClothingItem, Post } from '@fashion/shared';
import { RootStackParamList } from '../navigation/types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../theme';
import { LineIcon } from '../components/LineIcon';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

const FALLBACK_HERO_RATIO = 1.3;

export function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});

  const heroHeight = Math.round(width * FALLBACK_HERO_RATIO);
  const heroImageUri = post?.imageUrls[0] ?? null;

  const loadPost = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getPost(postId);
      setPost(data);
      setIsSaved(Boolean(data.isSavedByMe));
      setError(null);

      if (data.creator.id !== user?.id) {
        const creatorProfile = await api.getUserProfile(data.creator.id);
        setIsFollowing(creatorProfile.isFollowedByMe);
      }
    } catch (loadError) {
      console.error('Failed to load post detail:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [postId, user?.id]);

  useEffect(() => {
    loadPost();
    api.trackEvent({ eventName: 'post_viewed', properties: { postId } }).catch(console.error);
  }, [loadPost, postId]);

  const handleLike = useCallback(async () => {
    if (!post) return;

    const previousLiked = post.isLikedByMe;
    const previousLikeCount = post.likeCount;
    setPost({ ...post, isLikedByMe: !previousLiked, likeCount: previousLikeCount + (previousLiked ? -1 : 1) });

    try {
      if (previousLiked) {
        await api.unlikePost(post.id);
      } else {
        await api.likePost(post.id);
      }
    } catch (likeError) {
      console.error('Failed to update like status:', likeError);
      setPost({ ...post, isLikedByMe: previousLiked, likeCount: previousLikeCount });
    }
  }, [post]);

  const handleSave = useCallback(async () => {
    if (!post) return;

    try {
      if (isSaved) {
        await api.unsavePost(post.id);
        setIsSaved(false);
      } else {
        await api.savePost(post.id);
        setIsSaved(true);
        const itemCount = post.clothingItems?.length ?? 0;
        if (itemCount > 0) {
          Alert.alert('Saved', `Post saved and ${itemCount} tagged item${itemCount === 1 ? '' : 's'} added to your wardrobe.`);
        }
      }
    } catch (saveError) {
      console.error('Failed to save post:', saveError);
      Alert.alert('Error', 'Could not update save status.');
    }
  }, [isSaved, post]);

  const handleShare = useCallback(async () => {
    if (!post) return;
    try {
      await Share.share({
        message: post.caption ? `${post.caption}\n\n${post.imageUrls[0]}` : post.imageUrls[0],
        url: post.imageUrls[0],
      });
    } catch (shareError) {
      console.error('Failed to share post:', shareError);
    }
  }, [post]);

  const handleCreatorPress = useCallback(() => {
    if (!post) return;
    navigation.replace('UserProfile', { userId: post.creator.id });
  }, [navigation, post]);

  const handleFollowToggle = useCallback(async () => {
    if (!post || followLoading || post.creator.id === user?.id) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.unfollowUser(post.creator.id);
        setIsFollowing(false);
      } else {
        await api.followUser(post.creator.id);
        setIsFollowing(true);
      }
    } catch (followError) {
      console.error('Failed to update follow state:', followError);
      Alert.alert('Error', 'Could not update follow state.');
    } finally {
      setFollowLoading(false);
    }
  }, [followLoading, isFollowing, post, user?.id]);

  const handleAddTaggedItem = useCallback(
    async (item: ClothingItem) => {
      if (addedItems[item.id]) return;
      try {
        await api.addToWardrobe(item.id);
        setAddedItems((previous) => ({ ...previous, [item.id]: true }));
      } catch (addError) {
        console.error('Failed to add tagged item:', addError);
        Alert.alert('Error', 'Could not add this item to your wardrobe.');
      }
    },
    [addedItems],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scroll: {
          flex: 1,
        },
        topBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
        backButton: {
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: theme.colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
        },
        backIcon: {
          color: '#ffffff',
          fontSize: 24,
          fontWeight: '700',
        },
        heroFrame: {
          width: '100%',
          height: heroHeight,
          backgroundColor: theme.colors.surfaceMuted,
        },
        heroImage: {
          width: '100%',
          height: '100%',
        },
        body: {
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 40,
        },
        section: {
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 14,
          marginBottom: 12,
        },
        loadingWrap: {
          paddingVertical: 40,
          alignItems: 'center',
          justifyContent: 'center',
        },
        creatorHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        },
        creatorPressable: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          flex: 1,
        },
        avatar: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: theme.colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatarFallbackText: {
          color: theme.colors.textPrimary,
          fontSize: 16,
          fontWeight: '700',
        },
        creatorName: {
          color: theme.colors.textPrimary,
          fontSize: 16,
          fontWeight: '700',
        },
        creatorMeta: {
          color: theme.colors.textSecondary,
          fontSize: 13,
          marginTop: 2,
        },
        followButton: {
          borderRadius: 18,
          width: 36,
          height: 36,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
        },
        followButtonActive: {
          backgroundColor: theme.colors.tint,
          borderColor: theme.colors.tint,
        },
        followText: {
          color: theme.colors.textPrimary,
          fontSize: 18,
          fontWeight: '600',
        },
        followTextActive: {
          color: '#ffffff',
        },
        actionsRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        },
        actionButton: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceElevated,
          paddingHorizontal: 11,
          paddingVertical: 8,
        },
        actionIcon: {
          fontSize: 16,
        },
        actionText: {
          color: theme.colors.textPrimary,
          fontSize: 13,
          fontWeight: '600',
        },
        caption: {
          color: theme.colors.textPrimary,
          fontSize: 15,
          lineHeight: 22,
        },
        tagsRow: {
          marginTop: 12,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        },
        tagPill: {
          borderRadius: 20,
          backgroundColor: theme.colors.surfaceMuted,
          paddingHorizontal: 10,
          paddingVertical: 6,
        },
        tagText: {
          color: theme.colors.textSecondary,
          fontSize: 12,
          fontWeight: '600',
        },
        sectionTitle: {
          color: theme.colors.textPrimary,
          fontSize: 15,
          fontWeight: '700',
          marginBottom: 12,
        },
        taggedItem: {
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 8,
          backgroundColor: theme.colors.surfaceElevated,
          padding: 12,
          marginBottom: 10,
        },
        taggedTopRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
        },
        taggedName: {
          color: theme.colors.textPrimary,
          fontSize: 14,
          fontWeight: '600',
          flex: 1,
        },
        taggedMeta: {
          color: theme.colors.textSecondary,
          fontSize: 12,
          marginTop: 4,
        },
        addButton: {
          borderRadius: 20,
          backgroundColor: theme.colors.tint,
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
        },
        addButtonDone: {
          backgroundColor: theme.colors.success,
        },
        addButtonText: {
          color: '#ffffff',
          fontSize: 16,
          fontWeight: '700',
        },
        commentsText: {
          color: theme.colors.textSecondary,
          fontSize: 14,
        },
        errorText: {
          color: theme.colors.danger,
          fontSize: 14,
          marginBottom: 12,
        },
        retryButton: {
          borderRadius: 20,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: 16,
          paddingVertical: 9,
          backgroundColor: theme.colors.surfaceElevated,
          alignSelf: 'flex-start',
        },
        retryText: {
          color: theme.colors.textPrimary,
          fontWeight: '600',
          fontSize: 16,
        },
      }),
    [heroHeight, theme],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <LineIcon name="close" style={styles.backIcon} />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroFrame}>
          {heroImageUri ? <Image source={{ uri: heroImageUri }} style={styles.heroImage} resizeMode="cover" /> : null}
        </View>

        <View style={styles.body}>
          {loading ? (
            <View style={[styles.section, styles.loadingWrap]}>
              <ActivityIndicator size="small" color={theme.colors.tint} />
            </View>
          ) : error ? (
            <View style={styles.section}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={loadPost}>
                <LineIcon name="refresh" style={styles.retryText} />
              </Pressable>
            </View>
          ) : post ? (
            <>
              <View style={styles.section}>
                <View style={styles.creatorHeader}>
                  <Pressable style={styles.creatorPressable} onPress={handleCreatorPress}>
                    {post.creator.avatarUrl ? (
                      <Image source={{ uri: post.creator.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarFallbackText}>{post.creator.displayName.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.creatorName}>{post.creator.displayName}</Text>
                      <Text style={styles.creatorMeta}>{post.creator.accountType}</Text>
                    </View>
                  </Pressable>

                  {post.creator.id !== user?.id && (
                    <Pressable
                      style={[styles.followButton, isFollowing && styles.followButtonActive]}
                      onPress={handleFollowToggle}
                      disabled={followLoading}
                    >
                      <LineIcon
                        name={isFollowing ? 'following' : 'follow'}
                        style={[styles.followText, isFollowing && styles.followTextActive]}
                      />
                    </Pressable>
                  )}
                </View>

                <View style={styles.actionsRow}>
                  <Pressable style={styles.actionButton} onPress={handleLike}>
                    <LineIcon name={post.isLikedByMe ? 'heartFilled' : 'heart'} style={styles.actionIcon} />
                    <Text style={styles.actionText}>{post.likeCount}</Text>
                  </Pressable>

                  <Pressable style={styles.actionButton} onPress={handleSave}>
                    <LineIcon name={isSaved ? 'bookmarkFilled' : 'bookmark'} style={styles.actionIcon} />
                  </Pressable>

                  <Pressable style={styles.actionButton} onPress={handleShare}>
                    <LineIcon name="share" style={styles.actionIcon} />
                  </Pressable>
                </View>

                {post.caption && <Text style={styles.caption}>{post.caption}</Text>}
                {post.tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {post.tags.map((tag) => (
                      <View key={tag} style={styles.tagPill}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {post.clothingItems && post.clothingItems.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tagged Clothes</Text>
                  {post.clothingItems.map((item) => (
                    <View style={styles.taggedItem} key={item.id}>
                      <View style={styles.taggedTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.taggedName}>{item.name ?? item.brand ?? 'Tagged piece'}</Text>
                          <Text style={styles.taggedMeta}>
                            {[item.category, item.color].filter(Boolean).join(' • ') || 'No details'}
                          </Text>
                        </View>
                        <Pressable
                          style={[styles.addButton, addedItems[item.id] && styles.addButtonDone]}
                          onPress={() => handleAddTaggedItem(item)}
                          disabled={addedItems[item.id]}
                        >
                          <LineIcon
                            name={addedItems[item.id] ? 'check' : 'plus'}
                            style={styles.addButtonText}
                          />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Comments</Text>
                <Text style={styles.commentsText}>
                  Comment threads are rolling out. For now, save or share this look to keep track.
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
