import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Post } from '@fashion/shared';

interface FeedCardProps {
  post: Post;
  width: number;
  onPress: () => void;
  onLike: () => void;
}

export function FeedCard({ post, width, onPress, onLike }: FeedCardProps) {
  const imageHeight = width * 1.4; // 1:1.4 aspect ratio
  const firstImage = post.imageUrls[0];

  return (
    <TouchableOpacity
      style={[styles.container, { width }]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      <Image
        source={{ uri: firstImage }}
        style={[styles.image, { width, height: imageHeight }]}
        resizeMode="cover"
      />

      {post.imageUrls.length > 1 && (
        <View style={styles.carouselIndicator}>
          <Text style={styles.carouselText}>1/{post.imageUrls.length}</Text>
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.creatorRow}>
          {post.creator.avatarUrl ? (
            <Image
              source={{ uri: post.creator.avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {post.creator.displayName[0].toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.creatorName} numberOfLines={1}>
            {post.creator.displayName}
          </Text>
        </View>

        {post.caption && (
          <Text style={styles.caption} numberOfLines={2}>
            {post.caption}
          </Text>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={onLike}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.likeIcon}>{post.isLikedByMe ? '❤️' : '🤍'}</Text>
            <Text style={styles.likeCount}>{post.likeCount}</Text>
          </TouchableOpacity>

          {post.tags.length > 0 && (
            <Text style={styles.tags} numberOfLines={1}>
              {post.tags.slice(0, 2).join(' ')}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  image: {
    backgroundColor: '#e0e0e0',
  },
  carouselIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  carouselText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  overlay: {
    padding: 12,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  avatarPlaceholder: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  caption: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  likeCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  tags: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    marginLeft: 12,
  },
});
