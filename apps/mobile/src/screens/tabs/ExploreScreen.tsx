import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Post } from '@fashion/shared';
import { api } from '../../services/api';
import { FeedCard } from '../../components/FeedCard';
import { SkeletonFeedCard } from '../../components/SkeletonFeedCard';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 12;
const SIDE_PADDING = 16;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - SIDE_PADDING * 2 - COLUMN_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export function ExploreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadFeed = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setCursor(null);
        setPosts([]);
      } else {
        setLoading(true);
      }

      const response = await api.getFeed(20, isRefresh ? undefined : cursor || undefined);

      if (isRefresh) {
        setPosts(response.posts);
      } else {
        setPosts((prev) => [...prev, ...response.posts]);
      }

      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [cursor]);

  useEffect(() => {
    loadFeed();
  }, []);

  const handleRefresh = () => {
    loadFeed(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && cursor) {
      setLoadingMore(true);
      loadFeed(false);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLikedByMe: !isLiked,
              likeCount: post.likeCount + (isLiked ? -1 : 1),
            }
          : post
      )
    );

    try {
      if (isLiked) {
        await api.unlikePost(postId);
      } else {
        await api.likePost(postId);
      }
    } catch (error) {
      // Revert optimistic update on error
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLikedByMe: isLiked,
                likeCount: post.likeCount + (isLiked ? 1 : -1),
              }
            : post
        )
      );
      console.error('Failed to like/unlike post:', error);
    }
  };

  const handlePostPress = (post: Post) => {
    navigation.navigate('PostDetail', { postId: post.id });
  };

  // Masonry layout: Split posts into 2 columns
  const leftColumn: Post[] = [];
  const rightColumn: Post[] = [];

  posts.forEach((post, index) => {
    if (index % 2 === 0) {
      leftColumn.push(post);
    } else {
      rightColumn.push(post);
    }
  });

  const renderColumn = (columnPosts: Post[]) => (
    <View style={styles.column}>
      {columnPosts.map((post) => (
        <FeedCard
          key={post.id}
          post={post}
          width={CARD_WIDTH}
          onPress={() => handlePostPress(post)}
          onLike={() => handleLike(post.id, post.isLikedByMe)}
        />
      ))}
    </View>
  );

  const renderSkeletons = () => (
    <View style={styles.container}>
      <View style={styles.masonryContainer}>
        <View style={styles.column}>
          {[1, 2, 3].map((i) => (
            <SkeletonFeedCard key={`skeleton-left-${i}`} width={CARD_WIDTH} />
          ))}
        </View>
        <View style={styles.column}>
          {[1, 2, 3].map((i) => (
            <SkeletonFeedCard key={`skeleton-right-${i}`} width={CARD_WIDTH} />
          ))}
        </View>
      </View>
    </View>
  );

  if (loading && posts.length === 0) {
    return renderSkeletons();
  }

  return (
    <FlatList
      data={[{ key: 'masonry' }]}
      renderItem={() => (
        <View style={styles.masonryContainer}>
          {renderColumn(leftColumn)}
          {renderColumn(rightColumn)}
        </View>
      )}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#000"
        />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={() =>
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color="#000" />
          </View>
        ) : !hasMore && posts.length > 0 ? (
          <View style={styles.footer}>
            <Text style={styles.endText}>You've reached the end!</Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 8,
    paddingBottom: 16,
  },
  masonryContainer: {
    flexDirection: 'row',
    gap: COLUMN_GAP,
  },
  column: {
    flex: 1,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endText: {
    fontSize: 14,
    color: '#666',
  },
});
