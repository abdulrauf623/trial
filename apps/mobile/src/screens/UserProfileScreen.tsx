import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { api } from '../services/api';
import { UserProfile, Post } from '@fashion/shared';
import { ReportModal } from '../components/ReportModal';

type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_SIZE = SCREEN_WIDTH / 3 - 1;

export function UserProfileScreen() {
  const route = useRoute<UserProfileRouteProp>();
  const navigation = useNavigation();
  const { userId } = route.params;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const profileData = await api.getUserProfile(userId);
      setProfile(profileData);
      setIsFollowing(profileData.isFollowedByMe);

      const postsData = await api.getUserPosts(userId, 20);
      setPosts(postsData.posts);
      setNextCursor(postsData.nextCursor);
      setHasMore(postsData.hasMore);
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;

    try {
      setLoadingMore(true);
      const postsData = await api.getUserPosts(userId, 20, nextCursor);
      setPosts((prev) => [...prev, ...postsData.posts]);
      setNextCursor(postsData.nextCursor);
      setHasMore(postsData.hasMore);
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, loadingMore, hasMore, nextCursor]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

  const renderHeader = () => {
    if (!profile) return null;

    return (
      <View style={styles.header}>
        <View style={styles.avatarSection}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {profile.displayName.charAt(0).toUpperCase()}
              </Text>
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
            <Text style={[styles.buttonText, isFollowing && styles.buttonTextSecondary]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonSecondary, styles.reportButton]}
            onPress={() => setShowReportModal(true)}
          >
            <Text style={styles.buttonTextSecondary}>Report</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />
      </View>
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Pressable
      style={styles.gridItem}
      onPress={() => (navigation as any).navigate('PostDetail', { postId: item.id })}
    >
      <Image source={{ uri: item.imageUrls[0] }} style={styles.gridImage} />
      {item.imageUrls.length > 1 && (
        <View style={styles.multipleIndicator}>
          <Text style={styles.multipleIcon}>⋮⋮</Text>
        </View>
      )}
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        onEndReached={loadMorePosts}
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
    paddingBottom: 16,
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
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 20,
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
