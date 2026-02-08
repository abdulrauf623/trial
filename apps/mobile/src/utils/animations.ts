import {
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

export const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

export const softSpringConfig = {
  damping: 20,
  stiffness: 90,
  mass: 1,
};

export const bouncySpringConfig = {
  damping: 10,
  stiffness: 100,
  mass: 0.8,
};

export const timingConfig = {
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

export const fastTimingConfig = {
  duration: 200,
  easing: Easing.bezier(0.4, 0.0, 0.2, 1),
};

export const slowTimingConfig = {
  duration: 500,
  easing: Easing.bezier(0.4, 0.0, 0.2, 1),
};

export function createSpringAnimation(
  value: number,
  config = springConfig
) {
  'worklet';
  return withSpring(value, config);
}

export function createTimingAnimation(
  value: number,
  config = timingConfig
) {
  'worklet';
  return withTiming(value, config);
}

export function createPulseAnimation(
  fromValue: number,
  toValue: number,
  duration = 800
) {
  'worklet';
  return withRepeat(
    withSequence(
      withTiming(toValue, { duration: duration / 2 }),
      withTiming(fromValue, { duration: duration / 2 })
    ),
    -1,
    true
  );
}

export function createBounceAnimation(value: number) {
  'worklet';
  return withSequence(
    withSpring(value * 1.1, bouncySpringConfig),
    withSpring(value, springConfig)
  );
}

export function createShakeAnimation() {
  'worklet';
  return withSequence(
    withTiming(10, { duration: 50 }),
    withTiming(-10, { duration: 50 }),
    withTiming(10, { duration: 50 }),
    withTiming(-10, { duration: 50 }),
    withTiming(0, { duration: 50 })
  );
}

export function createFadeIn(duration = 300) {
  'worklet';
  return withTiming(1, { duration, easing: Easing.out(Easing.ease) });
}

export function createFadeOut(duration = 300) {
  'worklet';
  return withTiming(0, { duration, easing: Easing.in(Easing.ease) });
}

export function createSlideIn(toValue: number, duration = 300) {
  'worklet';
  return withTiming(toValue, {
    duration,
    easing: Easing.out(Easing.cubic),
  });
}

export interface AnimationCallbacks {
  onStart?: () => void;
  onEnd?: (finished: boolean) => void;
}

export function withCallback(
  animation: any,
  callback?: (finished: boolean) => void
) {
  'worklet';
  if (!callback) return animation;

  return withTiming(animation.toValue || 1, animation.config || {}, (finished?: boolean) => {
    if (callback) {
      runOnJS(callback)(finished || false);
    }
  });
}

export const AnimationPresets = {
  fadeIn: { opacity: createFadeIn() },
  fadeOut: { opacity: createFadeOut() },
  slideInLeft: { translateX: createSlideIn(0) },
  slideInRight: { translateX: createSlideIn(0) },
  slideInUp: { translateY: createSlideIn(0) },
  slideInDown: { translateY: createSlideIn(0) },
  scaleIn: { scale: createSpringAnimation(1) },
  scaleOut: { scale: createSpringAnimation(0) },
};
