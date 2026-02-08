import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { GestureHandlerRootView, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { AnimatedButton } from '../components/AnimatedButton';
import { springConfig } from '../utils/animations';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_HEIGHT = SCREEN_HEIGHT * 0.5;
const ITEM_SIZE = 80;

interface WardrobeItem {
  id: string;
  imageUrl: string;
  category: string;
  name: string;
}

interface OutfitItem {
  id: string;
  wardrobeItem: WardrobeItem;
  x: number;
  y: number;
}

export function OutfitBuilderScreen() {
  const [outfitItems, setOutfitItems] = useState<OutfitItem[]>([]);
  const [wardrobeItems] = useState<WardrobeItem[]>([
    {
      id: '1',
      imageUrl: 'https://via.placeholder.com/80',
      category: 'top',
      name: 'White T-Shirt',
    },
    {
      id: '2',
      imageUrl: 'https://via.placeholder.com/80',
      category: 'bottom',
      name: 'Blue Jeans',
    },
    {
      id: '3',
      imageUrl: 'https://via.placeholder.com/80',
      category: 'shoes',
      name: 'Sneakers',
    },
    {
      id: '4',
      imageUrl: 'https://via.placeholder.com/80',
      category: 'accessory',
      name: 'Watch',
    },
  ]);

  const handleSaveOutfit = () => {
    Alert.alert('Success', 'Outfit saved!');
  };

  const handleClearOutfit = () => {
    setOutfitItems([]);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Outfit Builder</Text>
        <Text style={styles.subtitle}>Drag items to create your outfit</Text>
      </View>

      <View style={styles.canvas}>
        <Text style={styles.canvasLabel}>Canvas</Text>
        {outfitItems.map((item) => (
          <DraggableOutfitItem key={item.id} item={item} />
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.wardrobeSection}>
        <Text style={styles.sectionTitle}>Your Wardrobe</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.wardrobeList}
        >
          {wardrobeItems.map((item) => (
            <DraggableWardrobeItem
              key={item.id}
              item={item}
              onDrop={(x, y) => {
                const newItem: OutfitItem = {
                  id: `${item.id}-${Date.now()}`,
                  wardrobeItem: item,
                  x,
                  y,
                };
                setOutfitItems((prev) => [...prev, newItem]);
              }}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.actions}>
        <AnimatedButton
          onPress={handleClearOutfit}
          variant="outline"
          style={styles.actionButton}
        >
          Clear
        </AnimatedButton>
        <AnimatedButton
          onPress={handleSaveOutfit}
          variant="primary"
          style={styles.actionButton}
        >
          Save Outfit
        </AnimatedButton>
      </View>
    </GestureHandlerRootView>
  );
}

function DraggableWardrobeItem({
  item,
  onDrop,
}: {
  item: WardrobeItem;
  onDrop: (x: number, y: number) => void;
}) {
  const { gesture, animatedStyle, reset } = useDragAndDrop({
    onDrop: (x, y) => {
      if (y < -100) {
        onDrop(x, y);
      }
      reset();
    },
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.wardrobeItem, animatedStyle]}>
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

function DraggableOutfitItem({
  item,
}: {
  item: OutfitItem;
}) {
  const translateX = useSharedValue(item.x);
  const translateY = useSharedValue(item.y);
  const scale = useSharedValue(1);

  const { gesture } = useDragAndDrop({
    onDragStart: () => {
      scale.value = withSpring(1.1, springConfig);
    },
    onDragEnd: (x, y) => {
      scale.value = withSpring(1, springConfig);
      translateX.value = x;
      translateY.value = y;
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.outfitItem, animatedStyle]}>
        <Image source={{ uri: item.wardrobeItem.imageUrl }} style={styles.outfitItemImage} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  canvas: {
    height: CANVAS_HEIGHT,
    backgroundColor: '#fafafa',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  canvasLabel: {
    position: 'absolute',
    top: 20,
    left: 20,
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  divider: {
    height: 2,
    backgroundColor: '#000',
  },
  wardrobeSection: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  wardrobeList: {
    gap: 12,
    paddingRight: 20,
  },
  wardrobeItem: {
    width: ITEM_SIZE,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
  },
  outfitItem: {
    position: 'absolute',
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  outfitItemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
  },
});
