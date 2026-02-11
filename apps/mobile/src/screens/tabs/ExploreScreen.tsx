import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Post } from '@fashion/shared';
import { ExplorePhotoTile } from '../../components/ExplorePhotoTile';
import { RootStackParamList } from '../../navigation/types';
import { api } from '../../services/api';
import { useAppTheme } from '../../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SIDE_PADDING = 12;
const COLUMN_GAP = 8;

type ExploreFeedPage = {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function ExploreScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const numColumns = width >= 840 ? 3 : 2;
  const cardWidth =
    (width - SIDE_PADDING * 2 - COLUMN_GAP * (numColumns - 1)) / numColumns;

  const loadFeed = useCallback(
    async ({ isRefresh, nextCursor }: { isRefresh: boolean; nextCursor?: string | null }) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else if (!nextCursor) {
          setLoading(true);
        }

        const cursorToUse = isRefresh ? undefined : nextCursor ?? undefined;
        let response: ExploreFeedPage;
        try {
          response = await api.getExploreFeed(24, cursorToUse);
        } catch (error) {
          console.warn('[Explore] Personalized feed unavailable, falling back to legacy feed.', error);
          response = await api.getFeed(24, cursorToUse);
        }

        setPosts((prev) => (isRefresh ? response.posts : [...prev, ...response.posts]));
        setCursor(response.nextCursor);
        setHasMore(response.hasMore);
      } catch (error) {
        console.error('Failed to load explore feed:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadFeed({ isRefresh: false, nextCursor: null });
  }, [loadFeed]);

  const handleRefresh = useCallback(() => {
    setCursor(null);
    setHasMore(true);
    loadFeed({ isRefresh: true });
  }, [loadFeed]);

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore && cursor) {
      setLoadingMore(true);
      loadFeed({ isRefresh: false, nextCursor: cursor });
    }
  }, [cursor, hasMore, loadFeed, loading, loadingMore]);

  const handlePostPress = useCallback(
    (post: Post) => {
      navigation.navigate('PostDetail', {
        postId: post.id,
      });
    },
    [navigation],
  );

  const columns = useMemo(() => {
    const grouped: Post[][] = Array.from({ length: numColumns }, () => []);
    posts.forEach((post, index) => {
      grouped[index % numColumns].push(post);
    });
    return grouped;
  }, [numColumns, posts]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingHorizontal: SIDE_PADDING,
          paddingTop: 8,
          paddingBottom: 28,
        },
        masonryContainer: {
          flexDirection: 'row',
          gap: COLUMN_GAP,
        },
        column: {
          flex: 1,
        },
        footer: {
          paddingTop: 14,
          paddingBottom: 20,
          alignItems: 'center',
        },
        endText: {
          fontSize: 13,
          color: theme.colors.textSecondary,
        },
        loadingWrap: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        },
      }),
    [theme.colors.background, theme.colors.textSecondary],
  );

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={theme.colors.tint} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={['masonry']}
      keyExtractor={(item) => item}
      renderItem={() => (
        <View style={styles.masonryContainer}>
          {columns.map((columnPosts, columnIndex) => (
            <View key={`column-${columnIndex}`} style={styles.column}>
              {columnPosts.map((post) => (
                <ExplorePhotoTile
                  key={post.id}
                  post={post}
                  width={cardWidth}
                  theme={theme}
                  onPress={handlePostPress}
                />
              ))}
            </View>
          ))}
        </View>
      )}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.tint}
          colors={[theme.colors.tint]}
          progressBackgroundColor={theme.colors.surface}
        />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.6}
      removeClippedSubviews
      windowSize={8}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={theme.colors.tint} />
          </View>
        ) : !hasMore && posts.length > 0 ? (
          <View style={styles.footer}>
            <Text style={styles.endText}>You&apos;re all caught up.</Text>
          </View>
        ) : null
      }
    />
  );
}
