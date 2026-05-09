import {
  Easing,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

// Timing constants
export const TIMING = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  verySlow: 800,
} as const;

// Spring configs
export const SPRING = {
  gentle: {
    damping: 20,
    stiffness: 100,
    mass: 1,
  },
  bouncy: {
    damping: 12,
    stiffness: 180,
    mass: 1,
  },
  snappy: {
    damping: 25,
    stiffness: 300,
    mass: 1,
  },
  slow: {
    damping: 20,
    stiffness: 50,
    mass: 1,
  },
} as const;

// Easing presets
export const EASE = {
  ease: Easing.bezierFn(0.25, 0.1, 0.25, 1),
  easeIn: Easing.bezierFn(0.42, 0, 1, 1),
  easeOut: Easing.bezierFn(0, 0, 0.58, 1),
  easeInOut: Easing.bezierFn(0.42, 0, 0.58, 1),
} as const;

// Animation creators
export const fadeIn = (duration = TIMING.normal) =>
  withTiming(1, { duration, easing: EASE.easeOut });

export const fadeOut = (duration = TIMING.normal) =>
  withTiming(0, { duration, easing: EASE.easeIn });

export const slideInY = (from: number, duration = TIMING.normal) =>
  withSpring(0, { ...SPRING.snappy, damping: 20 });

export const scaleIn = () =>
  withSpring(1, SPRING.bouncy);

export const scaleOut = () =>
  withTiming(0, { duration: TIMING.fast, easing: EASE.easeIn });

export const pulse = () =>
  withRepeat(
    withSequence(
      withTiming(1.05, { duration: 500 }),
      withTiming(1, { duration: 500 })
    ),
    -1,
    true
  );

// Stagger delay helper
export const staggerDelay = (index: number, baseDelay = 50) =>
  withDelay(index * baseDelay, withTiming(1, { duration: TIMING.normal }));

// Interpolation helpers
export const interpolateOpacity = (value: number, inputRange: number[] = [0, 1]) =>
  interpolate(value, inputRange, [0, 1], Extrapolation.CLAMP);

export const interpolateScale = (value: number, inputRange: number[] = [0, 1]) =>
  interpolate(value, inputRange, [0.8, 1], Extrapolation.CLAMP);

export const interpolateTranslateY = (value: number, distance: number = 20, inputRange: number[] = [0, 1]) =>
  interpolate(value, inputRange, [distance, 0], Extrapolation.CLAMP);
