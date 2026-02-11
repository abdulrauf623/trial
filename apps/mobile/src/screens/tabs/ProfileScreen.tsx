import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Post, UserProfile } from '@fashion/shared';
import { api } from '../../services/api';
import { useAppTheme } from '../../theme';
import { ThemePreference } from '../../services/storage';
import { LineIcon, LineIconName } from '../../components/LineIcon';

const THEME_OPTIONS: Array<{ key: ThemePreference; icon: LineIconName }> = [
  { key: 'system', icon: 'system' },
  { key: 'light', icon: 'sun' },
  { key: 'dark', icon: 'moon' },
];

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const { theme, preference, setPreference } = useAppTheme();
  const { width } = useWindowDimensions();
  const imageSize = Math.floor((width - 4) / 3);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [user?.id]),
  );

  const loadProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const profileData = await api.getUserProfile(user.id);
      setProfile(profileData);

      const postsData = await api.getUserPosts(user.id, 20);
      setPosts(postsData.posts);
      setNextCursor(postsData.nextCursor);
      setHasMore(postsData.hasMore);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!hasMore || !nextCursor || !user?.id) return;

    try {
      const postsData = await api.getUserPosts(user.id, 20, nextCursor);
      setPosts((prev) => [...prev, ...postsData.posts]);
      setNextCursor(postsData.nextCursor);
      setHasMore(postsData.hasMore);
    } catch (error) {
      console.error('Failed to load more posts:', error);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        },
        header: {
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 16,
        },
        avatar: {
          width: 100,
          height: 100,
          borderRadius: 50,
          marginBottom: 12,
        },
        avatarPlaceholder: {
          backgroundColor: theme.colors.surfaceMuted,
          justifyContent: 'center',
          alignItems: 'center',
        },
        avatarText: {
          fontSize: 40,
          fontWeight: '600',
          color: theme.colors.textSecondary,
        },
        name: {
          fontSize: 20,
          fontWeight: '700',
          color: theme.colors.textPrimary,
          marginBottom: 4,
        },
        email: {
          fontSize: 14,
          color: theme.colors.textSecondary,
          marginBottom: 4,
        },
        badge: {
          fontSize: 14,
          color: theme.colors.textTertiary,
          textTransform: 'capitalize',
        },
        statsRow: {
          flexDirection: 'row',
          justifyContent: 'space-around',
          width: '100%',
          marginTop: 20,
          marginBottom: 20,
        },
        stat: {
          alignItems: 'center',
        },
        statValue: {
          fontSize: 20,
          fontWeight: '700',
          color: theme.colors.textPrimary,
        },
        statLabel: {
          fontSize: 14,
          color: theme.colors.textSecondary,
          marginTop: 4,
        },
        themeRow: {
          width: '100%',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 12,
          marginBottom: 10,
        },
        themeTitle: {
          color: theme.colors.textPrimary,
          fontSize: 14,
          fontWeight: '700',
          marginBottom: 10,
        },
        themeOptions: {
          flexDirection: 'row',
          gap: 8,
        },
        themeOption: {
          flex: 1,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
          backgroundColor: theme.colors.surfaceElevated,
        },
        themeOptionActive: {
          backgroundColor: theme.colors.tint,
          borderColor: theme.colors.tint,
        },
        themeOptionLabel: {
          fontSize: 17,
          color: theme.colors.textPrimary,
          fontWeight: '600',
        },
        themeOptionLabelActive: {
          color: theme.mode === 'dark' ? '#0f172a' : '#ffffff',
        },
        logoutButton: {
          backgroundColor: theme.colors.danger,
          width: 52,
          height: 42,
          borderRadius: theme.radius.md,
          marginTop: 8,
          alignItems: 'center',
          justifyContent: 'center',
        },
        logoutText: {
          color: '#ffffff',
          fontSize: 20,
          fontWeight: '600',
        },
        createPostButton: {
          width: 56,
          height: 46,
          backgroundColor: theme.colors.tint,
          borderRadius: theme.radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        },
        createPostButtonText: {
          color: theme.mode === 'dark' ? '#0f172a' : '#ffffff',
          fontSize: 26,
          fontWeight: '700',
        },
        styleProfileButton: {
          marginTop: 10,
          backgroundColor: theme.colors.tint,
          width: 52,
          height: 42,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
        },
        styleProfileButtonText: {
          color: theme.mode === 'dark' ? '#0f172a' : '#ffffff',
          fontSize: 18,
          fontWeight: '600',
        },
        divider: {
          height: 1,
          backgroundColor: theme.colors.divider,
          width: '100%',
          marginTop: 20,
        },
        gridRow: {
          gap: 2,
          marginBottom: 2,
        },
        gridItem: {
          width: imageSize,
          height: imageSize,
          backgroundColor: theme.colors.surfaceMuted,
        },
        gridImage: {
          width: '100%',
          height: '100%',
        },
      }),
    [
      imageSize,
      theme.colors.background,
      theme.colors.border,
      theme.colors.danger,
      theme.colors.divider,
      theme.colors.surface,
      theme.colors.surfaceElevated,
      theme.colors.surfaceMuted,
      theme.colors.textPrimary,
      theme.colors.textSecondary,
      theme.colors.textTertiary,
      theme.colors.tint,
      theme.mode,
      theme.radius.lg,
      theme.radius.md,
    ],
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {profile?.avatarUrl ? (
        <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>{user?.displayName.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.name}>{user?.displayName}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.badge}>{user?.accountType === 'creator' ? 'Creator' : 'User'}</Text>

      {profile ? (
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
      ) : null}

      {user?.accountType === 'creator' ? (
        <TouchableOpacity
          style={styles.createPostButton}
          onPress={() => (navigation as any).navigate('CreatePost')}
        >
          <LineIcon name="plus" style={styles.createPostButtonText} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.themeRow}>
        <Text style={styles.themeTitle}>Theme</Text>
        <View style={styles.themeOptions}>
          {THEME_OPTIONS.map((option) => {
            const isActive = option.key === preference;
            return (
              <Pressable
                key={option.key}
                style={[styles.themeOption, isActive && styles.themeOptionActive]}
                onPress={() => {
                  void setPreference(option.key);
                }}
              >
                <LineIcon
                  name={option.icon}
                  style={[
                    styles.themeOptionLabel,
                    isActive && styles.themeOptionLabelActive,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <TouchableOpacity style={styles.styleProfileButton} onPress={() => (navigation as any).navigate('Onboarding', { mode: 'edit' })}>
        <LineIcon name="edit" style={styles.styleProfileButtonText} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <LineIcon name="logout" style={styles.logoutText} />
      </TouchableOpacity>

      <View style={styles.divider} />
    </View>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <Pressable style={styles.gridItem} onPress={() => (navigation as any).navigate('PostDetail', { postId: item.id })}>
      <Image source={{ uri: item.imageUrls[0] }} style={styles.gridImage} />
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
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
        onEndReachedThreshold={0.6}
        removeClippedSubviews
      />
    </View>
  );
}
