import { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolate } from 'react-native-reanimated';

export function useParallax() {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const createParallaxStyle = (index: number, itemHeight: number, parallaxFactor = 0.5) => {
    return useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * itemHeight,
        index * itemHeight,
        (index + 1) * itemHeight,
      ];

      const translateY = interpolate(
        scrollY.value,
        inputRange,
        [-itemHeight * parallaxFactor, 0, itemHeight * parallaxFactor],
        Extrapolate.CLAMP
      );

      return {
        transform: [{ translateY }],
      };
    });
  };

  return { scrollY, scrollHandler, createParallaxStyle };
}
