/* eslint-disable react-hooks/immutability */
import React from 'react';
import { Pressable, PressableProps, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  scale?: number;
  bounce?: boolean;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  style,
  scale = 0.96,
  bounce = true,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const pressed = useSharedValue(1);

  const handlePressIn = (e: any) => {
    pressed.value = bounce
      ? withSpring(scale, { damping: 15, stiffness: 300 })
      : withTiming(scale, { duration: 50 });
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    pressed.value = bounce
      ? withSpring(1, { damping: 15, stiffness: 300 })
      : withTiming(1, { duration: 100 });
    onPressOut?.(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  return (
    <Pressable
      {...props}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={style}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({});
