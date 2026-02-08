import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonFeedCardProps {
  width: number;
}

export function SkeletonFeedCard({ width }: SkeletonFeedCardProps) {
  const imageHeight = width * 1.4;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <View style={[styles.container, { width }]}>
      <Animated.View
        style={[styles.imageSkeleton, { width, height: imageHeight, opacity }]}
      />
      <View style={styles.content}>
        <View style={styles.creatorRow}>
          <Animated.View style={[styles.avatar, { opacity }]} />
          <Animated.View style={[styles.nameSkeleton, { opacity }]} />
        </View>
        <Animated.View style={[styles.captionSkeleton1, { opacity }]} />
        <Animated.View style={[styles.captionSkeleton2, { opacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  imageSkeleton: {
    backgroundColor: '#e0e0e0',
  },
  content: {
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
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  nameSkeleton: {
    width: 100,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  captionSkeleton1: {
    width: '100%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    marginBottom: 6,
  },
  captionSkeleton2: {
    width: '60%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
});
