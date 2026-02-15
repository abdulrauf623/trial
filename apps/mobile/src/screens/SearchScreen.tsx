import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { Post } from '@fashion/shared';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { LineIcon } from '../components/LineIcon';
import { RootStackParamList } from '../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH / 3 - 1;

interface SearchFilters {
  category?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
}

interface SimilarItemResult {
  id: string;
  imageIndex?: number | null;
  post: {
    id: string;
    imageUrls: string[];
  };
}

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Search'>>();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'posts' | 'items'>('posts');
  const [results, setResults] = useState<Post[]>([]);
  const [itemResults, setItemResults] = useState<SimilarItemResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters] = useState<SearchFilters>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const similarItemId = route.params?.mode === 'similar' ? route.params.itemId : undefined;
  const isSimilarMode = Boolean(similarItemId);

  const handleSearch = useCallback(async (isLoadMore = false) => {
    if (isSimilarMode) return;
    if (!query.trim() && !isLoadMore) return;

    try {
      setLoading(true);
      const response = await api.search(query, {
        type: searchType,
        ...filters,
        cursor: isLoadMore ? nextCursor || undefined : undefined,
      });

      if (searchType === 'posts') {
        if (isLoadMore) {
          setResults((prev) => [...prev, ...response.posts]);
        } else {
          setResults(response.posts);
        }
      } else {
        const items = (response as any).items || [];
        if (isLoadMore) {
          setItemResults((prev) => [...prev, ...items]);
        } else {
          setItemResults(items);
        }
      }
      setNextCursor(response.nextCursor);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, isSimilarMode, nextCursor, query, searchType]);

  const handleSimilarSearch = useCallback(async () => {
    if (!similarItemId) return;

    try {
      setLoading(true);
      setSearchType('items');
      const similarItems = await api.searchSimilarItems(similarItemId, 60);
      setItemResults(similarItems || []);
      setResults([]);
      setNextCursor(null);
    } catch (error) {
      console.error('Similar search failed:', error);
      setItemResults([]);
    } finally {
      setLoading(false);
    }
  }, [similarItemId]);

  useEffect(() => {
    if (route.params?.initialQuery) {
      setQuery(route.params.initialQuery);
    }
  }, [route.params?.initialQuery]);

  useEffect(() => {
    if (isSimilarMode) {
      handleSimilarSearch();
    }
  }, [handleSimilarSearch, isSimilarMode]);

  useEffect(() => {
    setNextCursor(null);
    if (searchType === 'posts') {
      setItemResults([]);
    } else {
      setResults([]);
    }
  }, [searchType]);

  const loadSuggestions = async (text: string) => {
    if (isSimilarMode) return;
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const sugs = await api.getSearchSuggestions(text);
      setSuggestions(sugs);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    loadSuggestions(text);
  };

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
    handleSearch();
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Pressable
      style={styles.gridItem}
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
    >
      <Image source={{ uri: item.imageUrls[0] }} style={styles.gridImage} />
      {item.imageUrls.length > 1 && (
        <View style={styles.multipleIndicator}>
          <Text style={styles.multipleIcon}>⋮⋮</Text>
        </View>
      )}
    </Pressable>
  );

  const renderItem = ({ item }: { item: SimilarItemResult }) => {
    const imageUri = item.post?.imageUrls?.[item.imageIndex || 0] || item.post?.imageUrls?.[0];
    if (!imageUri) return null;

    return (
      <Pressable
        style={styles.gridItem}
        onPress={() => navigation.navigate('PostDetail', { postId: item.post.id })}
      >
        <Image source={{ uri: imageUri }} style={styles.gridImage} />
      </Pressable>
    );
  };

  const gridData = useMemo(
    () => (searchType === 'items' ? itemResults : results),
    [itemResults, results, searchType],
  );
  const hasResults = gridData.length > 0;

  const renderHeader = () => (
    <View style={styles.header}>
      {isSimilarMode ? (
        <View style={styles.modeBadge}>
          <LineIcon name="search" size={14} color="#fff" />
          <Text style={styles.modeBadgeText}>Tap Search Results</Text>
        </View>
      ) : null}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts, items, tags..."
          value={query}
          onChangeText={handleQueryChange}
          onSubmitEditing={() => handleSearch()}
          returnKeyType="search"
          editable={!isSimilarMode}
        />
        <Pressable onPress={() => handleSearch()} style={styles.searchButton} disabled={isSimilarMode}>
          <LineIcon name="search" style={styles.searchButtonText} />
        </Pressable>
      </View>

      {suggestions.length > 0 && !isSimilarMode && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.suggestions}>
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionPress(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </Animated.View>
      )}

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, searchType === 'posts' && styles.tabActive]}
          onPress={() => setSearchType('posts')}
        >
          <LineIcon name="grid" color={searchType === 'posts' ? '#fff' : '#666'} size={15} />
        </Pressable>
        <Pressable
          style={[styles.tab, searchType === 'items' && styles.tabActive]}
          onPress={() => setSearchType('items')}
        >
          <LineIcon name="wardrobe" color={searchType === 'items' ? '#fff' : '#666'} size={15} />
        </Pressable>
      </View>

      <View style={styles.filters}>
        <Text style={styles.filtersLabel}>Filters</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable style={styles.filterChip}>
            <LineIcon name="grid" size={14} color="#666" />
          </Pressable>
          <Pressable style={styles.filterChip}>
            <LineIcon name="sun" size={14} color="#666" />
          </Pressable>
          <Pressable style={styles.filterChip}>
            <LineIcon name="link" size={14} color="#666" />
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && !hasResults ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : !hasResults ? (
        <View style={styles.emptyContainer}>
          {renderHeader()}
          <View style={styles.emptyContent}>
            <LineIcon name="search" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>
              {isSimilarMode
                ? 'No similar clothing found for this photo yet.'
                : query
                  ? 'No results found'
                  : 'Search for posts, items, or tags'}
            </Text>
          </View>
        </View>
      ) : (
        <>
          {searchType === 'items' ? (
            <FlatList
              data={itemResults}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={renderHeader}
              numColumns={3}
              columnWrapperStyle={styles.gridRow}
              onEndReached={() => handleSearch(true)}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loading ? (
                  <View style={styles.footer}>
                    <ActivityIndicator size="small" color="#000" />
                  </View>
                ) : null
              }
            />
          ) : (
            <FlatList
              data={results}
              renderItem={renderPost}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={renderHeader}
              numColumns={3}
              columnWrapperStyle={styles.gridRow}
              onEndReached={() => handleSearch(true)}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loading ? (
                  <View style={styles.footer}>
                    <ActivityIndicator size="small" color="#000" />
                  </View>
                ) : null
              }
            />
          )}
        </>
      )}
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
  emptyContainer: {
    flex: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  modeBadge: {
    backgroundColor: '#111',
    borderRadius: 999,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  suggestions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 16,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  filters: {
    marginBottom: 16,
  },
  filtersLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
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
