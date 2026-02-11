import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  SharedValue,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';

const OPEN_DURATION_MS = 450; // Pinterest-style smooth expansion
const CLOSE_DURATION_MS = 400; // Quick, responsive close
// Ultra-premium, buttery-smooth easing curves for luxurious card expansion
const OPEN_EASING = Easing.bezier(0.16, 1, 0.3, 1); // Even smoother open
const CLOSE_EASING = Easing.bezier(0.32, 0, 0.15, 1); // Smoother close
const DEFAULT_CARD_RADIUS = 16;
const MIN_HERO_RATIO = 0.85;
const MAX_HERO_RATIO = 1.75;

const PHASE_IDLE = 0;
const PHASE_PRIMED = 1;
const PHASE_OPENING = 2;
const PHASE_OPEN = 3;
const PHASE_CLOSING = 4;

export type TransitionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ActivePostTransition = {
  postId: string;
  imageUrl: string;
  originRect: TransitionRect;
  targetRect: TransitionRect;
  originRadius: number;
  targetRadius: number;
};

type OpenTransitionInput = {
  postId: string;
  imageUrl: string;
  originRect?: TransitionRect;
  originRadius?: number;
};

type TransitionContextValue = {
  activeTransition: ActivePostTransition | null;
  progress: SharedValue<number>;
  isAnimating: boolean;
  isOpening: boolean;
  isClosing: boolean;
  captureOriginRect: (postId: string, rect: TransitionRect) => void;
  openTransition: (input: OpenTransitionInput) => ActivePostTransition | null;
  commitOpenTransition: (postId: string) => void;
  closeTransition: (postId: string, onComplete?: () => void) => void;
};

const TransitionContext = createContext<TransitionContextValue | null>(null);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function AnimatedPostTransitionProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(1);
  const phase = useSharedValue<number>(PHASE_IDLE);
  const closeCallbackRef = useRef<(() => void) | undefined>(undefined);
  const originRectsRef = useRef<Record<string, TransitionRect>>({});
  const activeTransitionRef = useRef<ActivePostTransition | null>(null);

  const [activeTransition, setActiveTransition] = useState<ActivePostTransition | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const finishOpen = useCallback(() => {
    setIsAnimating(false);
    setIsOpening(false);
    setIsClosing(false);
  }, []);

  const finishClose = useCallback(() => {
    setIsAnimating(false);
    setIsOpening(false);
    setIsClosing(false);
    setActiveTransition(null);
    activeTransitionRef.current = null;
    const callback = closeCallbackRef.current;
    closeCallbackRef.current = undefined;
    if (callback) {
      callback();
    }
  }, []);

  const captureOriginRect = useCallback((postId: string, rect: TransitionRect) => {
    originRectsRef.current[postId] = rect;
  }, []);

  const openTransition = useCallback(
    (input: OpenTransitionInput): ActivePostTransition | null => {
      if (isAnimating) {
        return null;
      }

      const startRect = input.originRect ?? originRectsRef.current[input.postId];
      if (!startRect) {
        return null;
      }

      const { width: screenWidth } = Dimensions.get('window');
      const ratio = clamp(startRect.height / Math.max(startRect.width, 1), MIN_HERO_RATIO, MAX_HERO_RATIO);
      const heroHeight = Math.round(screenWidth * ratio);
      // Lock target rect up-front so the hero lands exactly once with no post-layout snap.
      const nextTransition: ActivePostTransition = {
        postId: input.postId,
        imageUrl: input.imageUrl,
        originRect: startRect,
        targetRect: {
          x: 0,
          y: insets.top,
          width: screenWidth,
          height: heroHeight,
        },
        originRadius: input.originRadius ?? DEFAULT_CARD_RADIUS,
        targetRadius: 0,
      };

      setActiveTransition(nextTransition);
      activeTransitionRef.current = nextTransition;
      setIsAnimating(true);
      setIsOpening(true);
      setIsClosing(false);
      phase.value = PHASE_PRIMED;
      progress.value = 0;

      return nextTransition;
    },
    [insets.top, isAnimating, phase, progress],
  );

  const commitOpenTransition = useCallback(
    (postId: string) => {
      const currentTransition = activeTransitionRef.current;
      if (!currentTransition || currentTransition.postId !== postId) {
        return;
      }
      // Skip phase check - rely on activeTransitionRef which is synchronous
      // The phase SharedValue can have race conditions when read from JS thread

      phase.value = PHASE_OPENING;
      progress.value = 0;
      progress.value = withTiming(
        1,
        {
          duration: OPEN_DURATION_MS,
          easing: OPEN_EASING,
        },
        (finished) => {
          if (!finished) return;
          phase.value = PHASE_OPEN;
          runOnJS(finishOpen)();
        },
      );
    },
    [finishOpen, phase, progress],
  );

  const closeTransition = useCallback(
    (postId: string, onComplete?: () => void) => {
      const currentTransition = activeTransitionRef.current;
      if (!currentTransition || currentTransition.postId !== postId || isClosing) {
        if (onComplete) {
          onComplete();
        }
        return;
      }

      closeCallbackRef.current = onComplete;
      setIsAnimating(true);
      setIsOpening(false);
      setIsClosing(true);
      phase.value = PHASE_CLOSING;

      progress.value = withTiming(
        0,
        {
          duration: CLOSE_DURATION_MS,
          easing: CLOSE_EASING,
        },
        (finished) => {
          if (!finished) return;
          phase.value = PHASE_IDLE;
          runOnJS(finishClose)();
        },
      );
    },
    [finishClose, isClosing, phase, progress],
  );

  // Overlay layer that survives navigation changes so the hero image never snaps.
  const overlayImageStyle = useAnimatedStyle(() => {
    if (!activeTransition) {
      return { opacity: 0 };
    }

    const t = progress.value;
    const translateX = interpolate(
      t,
      [0, 1],
      [activeTransition.originRect.x, activeTransition.targetRect.x],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      t,
      [0, 1],
      [activeTransition.originRect.y, activeTransition.targetRect.y],
      Extrapolation.CLAMP,
    );
    const width = interpolate(
      t,
      [0, 1],
      [activeTransition.originRect.width, activeTransition.targetRect.width],
      Extrapolation.CLAMP,
    );
    const height = interpolate(
      t,
      [0, 1],
      [activeTransition.originRect.height, activeTransition.targetRect.height],
      Extrapolation.CLAMP,
    );
    const borderRadius = interpolate(
      t,
      [0, 1],
      [activeTransition.originRadius, activeTransition.targetRadius],
      Extrapolation.CLAMP,
    );

    let opacity = 0;
    if (phase.value === PHASE_PRIMED || phase.value === PHASE_OPENING) {
      opacity = 1;
    } else if (phase.value === PHASE_OPEN) {
      opacity = interpolate(t, [0.78, 0.98, 1], [1, 0.2, 0], Extrapolation.CLAMP);
    } else if (phase.value === PHASE_CLOSING) {
      opacity = 1;
    }

    return {
      opacity,
      width,
      height,
      borderRadius,
      transform: [{ translateX }, { translateY }],
    };
  }, [activeTransition]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },
        overlayContainer: {
          ...StyleSheet.absoluteFillObject,
          pointerEvents: 'none',
          zIndex: 1000,
        },
        overlayImageWrap: {
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'hidden',
          backgroundColor: theme.colors.surfaceMuted,
        },
        overlayImage: {
          width: '100%',
          height: '100%',
        },
      }),
    [theme.colors.surfaceMuted],
  );

  const value = useMemo<TransitionContextValue>(
    () => ({
      activeTransition,
      progress,
      isAnimating,
      isOpening,
      isClosing,
      captureOriginRect,
      openTransition,
      commitOpenTransition,
      closeTransition,
    }),
    [
      activeTransition,
      progress,
      isAnimating,
      isOpening,
      isClosing,
      captureOriginRect,
      openTransition,
      commitOpenTransition,
      closeTransition,
    ],
  );

  return (
    <TransitionContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        <View pointerEvents="none" style={styles.overlayContainer}>
          {activeTransition ? (
            <Animated.View style={[styles.overlayImageWrap, overlayImageStyle]}>
              <Image source={{ uri: activeTransition.imageUrl }} style={styles.overlayImage} resizeMode="cover" />
            </Animated.View>
          ) : null}
        </View>
      </View>
    </TransitionContext.Provider>
  );
}

export function useAnimatedPostTransition() {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('useAnimatedPostTransition must be used inside AnimatedPostTransitionProvider');
  }
  return context;
}
