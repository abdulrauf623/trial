import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  SharedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { springConfig } from '../utils/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = 200;

interface WardrobeCollection {
  id: string;
  name: string;
  icon?: string;
  itemCount: number;
  previewImages: string[];
}

interface WardrobeCollectionCardProps {
  collection: WardrobeCollection;
  index: number;
  scrollY: SharedValue<number>;
  onPress: () => void;
}

export function WardrobeCollectionCard({
  collection,
  index,
  scrollY,
  onPress,
}: WardrobeCollectionCardProps) {
  const scale = useSharedValue(1);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * (CARD_HEIGHT + 16),
      index * (CARD_HEIGHT + 16),
      (index + 1) * (CARD_HEIGHT + 16),
    ];

    const opacity = interpolate(
      scrollY.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      inputRange,
      [50, 0, -50],
      Extrapolate.CLAMP
    );

    const cardScale = interpolate(
      scrollY.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [
        { translateY },
        { scale: cardScale * scale.value },
      ],
    };
  });

  const imageAnimatedStyle = (imageIndex: number) => {
    return useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * (CARD_HEIGHT + 16),
        index * (CARD_HEIGHT + 16),
        (index + 1) * (CARD_HEIGHT + 16),
      ];

      const parallaxFactor = (imageIndex + 1) * 5;
      const translateY = interpolate(
        scrollY.value,
        inputRange,
        [-parallaxFactor, 0, parallaxFactor],
        Extrapolate.CLAMP
      );

      return {
        transform: [{ translateY }],
      };
    });
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.97, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        <View style={styles.imageContainer}>
          {collection.previewImages.slice(0, 3).map((imageUrl, imgIndex) => (
            <Animated.View
              key={imgIndex}
              style={[
                styles.imageWrapper,
                imageAnimatedStyle(imgIndex),
                {
                  left: imgIndex * 60,
                  zIndex: 3 - imgIndex,
                },
              ]}
            >
              <Image source={{ uri: imageUrl }} style={styles.previewImage} />
            </Animated.View>
          ))}
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            {collection.icon && <Text style={styles.icon}>{collection.icon}</Text>}
            <Text style={styles.name}>{collection.name}</Text>
          </View>
          <Text style={styles.itemCount}>{collection.itemCount} items</Text>
        </View>

        <View style={styles.gradient} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f5f5f5',
  },
  imageWrapper: {
    position: 'absolute',
    top: 30,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  icon: {
    fontSize: 24,
    marginRight: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
});
