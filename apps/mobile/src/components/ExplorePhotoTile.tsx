import React, { memo, useCallback, useMemo } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { Post } from '@fashion/shared';
import { AppTheme } from '../theme';

const HEIGHT_VARIANTS = [1.08, 1.2, 1.32, 1.42, 1.24];

interface ExplorePhotoTileProps {
  post: Post;
  width: number;
  theme: AppTheme;
  onPress: (post: Post) => void;
}

function getHeightMultiplier(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return HEIGHT_VARIANTS[Math.abs(hash) % HEIGHT_VARIANTS.length];
}

function ExplorePhotoTileBase({ post, width, theme, onPress }: ExplorePhotoTileProps) {
  const imageHeight = Math.round(width * getHeightMultiplier(post.id));
  const firstImage = post.imageUrls[0];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width,
          height: imageHeight,
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 12,
          backgroundColor: theme.colors.surfaceMuted,
        },
        image: {
          width: '100%',
          height: '100%',
        },
      }),
    [imageHeight, theme.colors.surfaceMuted, width],
  );

  const handlePress = useCallback(() => {
    onPress(post);
  }, [onPress, post]);

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Image source={{ uri: firstImage }} style={styles.image} resizeMode="cover" />
    </Pressable>
  );
}

export const ExplorePhotoTile = memo(
  ExplorePhotoTileBase,
  (prev, next) =>
    prev.post.id === next.post.id &&
    prev.post.imageUrls[0] === next.post.imageUrls[0] &&
    prev.width === next.width &&
    prev.theme.mode === next.theme.mode,
);
