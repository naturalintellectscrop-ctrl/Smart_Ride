 
import React, { useEffect } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  index?: number;
  delay?: number;
  slideFrom?: 'bottom' | 'top' | 'left' | 'right';
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  style,
  index = 0,
  delay = 50,
  slideFrom = 'bottom',
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const translateX = useSharedValue(
    slideFrom === 'left' ? 30 : slideFrom === 'right' ? -30 : 0
  );
  const translateY = useSharedValue(
    slideFrom === 'bottom' ? 30 : slideFrom === 'top' ? -30 : 0
  );

  useEffect(() => {
    const staggerDelay = index * delay;
    
    opacity.value = withDelay(
      staggerDelay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
    );
    scale.value = withDelay(
      staggerDelay,
      withSpring(1, { damping: 20, stiffness: 150 })
    );
    translateX.value = withDelay(
      staggerDelay,
      withSpring(0, { damping: 20, stiffness: 100 })
    );
    translateY.value = withDelay(
      staggerDelay,
      withSpring(0, { damping: 20, stiffness: 100 })
    );
  }, [index, delay, slideFrom]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[styles.card, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
  },
});
