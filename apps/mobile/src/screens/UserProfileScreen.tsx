import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Dimensions,
  Alert,
  PanResponder,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { api } from '../services/api';
import { UserProfile, Post } from '@fashion/shared';
import { ReportModal } from '../components/ReportModal';
import { LineIcon } from '../components/LineIcon';

type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;
type UserProfileNavigation = NativeStackNavigationProp<RootStackParamList>;
type ProfileTab = 'posted' | 'liked';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_SIZE = SCREEN_WIDTH / 3 - 1;

export function UserProfileScreen() {
  const route = useRoute<UserProfileRouteProp>();
  const navigation = useNavigation<UserProfileNavigation>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ProfileTab>('posted');

  const [postedPosts, setPostedPosts] = useState<Post[]>([]);
  const [postedNextCursor, setPostedNextCursor] = useState<string | null>(null);
  const [postedHasMore, setPostedHasMore] = useState(false);
  const [loadingPostedMore, setLoadingPostedMore] = useState(false);

  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [likedNextCursor, setLikedNextCursor] = useState<string | null>(null);
  const [likedHasMore, setLikedHasMore] = useState(false);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [loadingLikedMore, setLoadingLikedMore] = useState(false);
  const [likedInitialized, setLikedInitialized] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const profileData = await api.getUserProfile(userId);
      setProfile(profileData);
      setIsFollowing(profileData.isFollowedByMe);

      const postsData = await api.getUserPosts(userId, 20);
      setPostedPosts(postsData.posts);
      setPostedNextCursor(postsData.nextCursor);
      setPostedHasMore(postsData.hasMore);

      setActiveTab('posted');
      setLikedPosts([]);
      setLikedNextCursor(null);
      setLikedHasMore(false);
      setLikedInitialized(false);
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadMorePosted = useCallback(async () => {
    if (loadingPostedMore || !postedHasMore || !postedNextCursor) return;

    try {
      setLoadingPostedMore(true);
      const postsData = await api.getUserPosts(userId, 20, postedNextCursor);
      setPostedPosts((prev) => [...prev, ...postsData.posts]);
      setPostedNextCursor(postsData.nextCursor);
      setPostedHasMore(postsData.hasMore);
    } catch (error) {
      console.error('Failed to load more posted items:', error);
    } finally {
      setLoadingPostedMore(false);
    }
  }, [userId, loadingPostedMore, postedHasMore, postedNextCursor]);

  const loadLikedInitial = useCallback(async () => {
    if (loadingLiked || likedInitialized) return;

    try {
      setLoadingLiked(true);
      const postsData = await api.getUserLikedPosts(userId, 20);
      setLikedPosts(postsData.posts);
      setLikedNextCursor(postsData.nextCursor);
      setLikedHasMore(postsData.hasMore);
      setLikedInitialized(true);
    } catch (error) {
      console.error('Failed to load liked posts:', error);
    } finally {
      setLoadingLiked(false);
    }
  }, [userId, loadingLiked, likedInitialized]);

  const loadMoreLiked = useCallback(async () => {
    if (loadingLikedMore || !likedHasMore || !likedNextCursor) return;

    try {
      setLoadingLikedMore(true);
      const postsData = await api.getUserLikedPosts(userId, 20, likedNextCursor);
      setLikedPosts((prev) => [...prev, ...postsData.posts]);
      setLikedNextCursor(postsData.nextCursor);
      setLikedHasMore(postsData.hasMore);
    } catch (error) {
      console.error('Failed to load more liked items:', error);
    } finally {
      setLoadingLikedMore(false);
    }
  }, [userId, loadingLikedMore, likedHasMore, likedNextCursor]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (activeTab === 'liked' && !likedInitialized) {
      loadLikedInitial();
    }
  }, [activeTab, likedInitialized, loadLikedInitial]);

  const handleFollowToggle = async () => {
    try {
      if (isFollowing) {
        await api.unfollowUser(userId);
        setIsFollowing(false);
        if (profile) {
          setProfile({ ...profile, followerCount: profile.followerCount - 1 });
        }
      } else {
        await api.followUser(userId);
        setIsFollowing(true);
        if (profile) {
          setProfile({ ...profile, followerCount: profile.followerCount + 1 });
        }
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const handleReport = async (reason: string, description?: string) => {
    try {
      await api.reportContent({
        targetType: 'user',
        targetId: userId,
        reason: reason as any,
        description,
      });
      Alert.alert('Success', 'User reported successfully');
      setShowReportModal(false);
    } catch (error) {
      console.error('Failed to report user:', error);
      Alert.alert('Error', 'Failed to report user');
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -50 && activeTab === 'posted') {
            setActiveTab('liked');
            return;
          }

          if (gesture.dx > 50 && activeTab === 'liked') {
            setActiveTab('posted');
          }
        },
      }),
    [activeTab],
  );

  const renderHeader = () => {
    if (!profile) return null;

    return (
      <View style={styles.header}>
        <View style={styles.avatarSection}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{profile.displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.displayName}>{profile.displayName}</Text>
          <Text style={styles.accountType}>{profile.accountType}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.postCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.followerCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.button, isFollowing ? styles.buttonSecondary : styles.buttonPrimary]}
            onPress={handleFollowToggle}
          >
            <LineIcon
              name={isFollowing ? 'following' : 'follow'}
              color={isFollowing ? '#666' : '#fff'}
              size={17}
            />
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonSecondary, styles.reportButton]}
            onPress={() => setShowReportModal(true)}
          >
            <LineIcon name="report" color="#666" size={17} />
          </Pressable>
        </View>

        <View style={styles.postTabs}>
          <Pressable
            style={[styles.postTab, activeTab === 'posted' && styles.postTabActive]}
            onPress={() => setActiveTab('posted')}
          >
            <LineIcon
              name="grid"
              color={activeTab === 'posted' ? '#000' : '#999'}
              size={16}
            />
          </Pressable>
          <Pressable
            style={[styles.postTab, activeTab === 'liked' && styles.postTabActive]}
            onPress={() => setActiveTab('liked')}
          >
            <LineIcon
              name="heart"
              color={activeTab === 'liked' ? '#000' : '#999'}
              size={16}
            />
          </Pressable>
        </View>

        <Text style={styles.swipeHint}>Swipe left or right to switch tabs</Text>
      </View>
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Pressable style={styles.gridItem} onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
      <Image source={{ uri: item.imageUrls[0] }} style={styles.gridImage} />
      {item.imageUrls.length > 1 && (
        <View style={styles.multipleIndicator}>
          <Text style={styles.multipleIcon}>⋮⋮</Text>
        </View>
      )}
    </Pressable>
  );

  const handleLoadMore = () => {
    if (activeTab === 'posted') {
      loadMorePosted();
      return;
    }

    loadMoreLiked();
  };

  const currentPosts = activeTab === 'posted' ? postedPosts : likedPosts;
  const loadingMore = activeTab === 'posted' ? loadingPostedMore : loadingLikedMore;

  const renderEmptyState = () => {
    if (activeTab === 'liked' && loadingLiked) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={styles.emptyText}>Loading liked posts...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {activeTab === 'posted' ? 'No posts yet.' : 'No liked posts yet.'}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <FlatList
        key={activeTab}
        data={currentPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#000" />
            </View>
          ) : null
        }
      />

      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReport}
        targetType="user"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#666',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#000',
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  reportButton: {
    flex: 0,
    minWidth: 90,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonTextSecondary: {
    color: '#000',
  },
  postTabs: {
    flexDirection: 'row',
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  postTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  postTabActive: {
    borderBottomColor: '#000',
  },
  postTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  postTabTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  swipeHint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  gridRow: {
    gap: 1,
  },
  gridItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginBottom: 1,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  multipleIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 2,
  },
  multipleIcon: {
    color: '#fff',
    fontSize: 12,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
