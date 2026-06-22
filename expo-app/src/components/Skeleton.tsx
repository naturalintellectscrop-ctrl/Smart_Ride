// ============================================
// SMART RIDE MOBILE - SKELETON COMPONENTS
// ============================================
// Animated loading placeholders for list screens
// Uses Reanimated for smooth pulse animation
// ============================================

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, SPACING, RADIUS } from '@/src/constants';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius } as any,
        animatedStyle,
        style,
      ]}
    />
  );
}

// Pre-built skeleton layouts
export function ConversationSkeleton() {
  return (
    <View style={skeletonStyles.row}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={skeletonStyles.column}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function TaskSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.row}>
        <Skeleton width={40} height={40} borderRadius={8} />
        <View style={skeletonStyles.column}>
          <Skeleton width="70%" height={14} />
          <Skeleton width="50%" height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      <Skeleton width="90%" height={12} style={{ marginTop: 10 }} />
      <View style={skeletonStyles.rowBetween}>
        <Skeleton width={80} height={24} borderRadius={12} />
        <Skeleton width={60} height={20} borderRadius={10} />
      </View>
    </View>
  );
}

export function OrderSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <Skeleton width="50%" height={16} />
      <Skeleton width="80%" height={12} style={{ marginTop: 6 }} />
      <View style={skeletonStyles.rowBetween}>
        <Skeleton width={100} height={14} />
        <Skeleton width={60} height={20} borderRadius={10} />
      </View>
    </View>
  );
}

export function NotificationSkeleton() {
  return (
    <View style={skeletonStyles.row}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={skeletonStyles.column}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} style={{ marginTop: 4 }} />
        <Skeleton width="20%" height={10} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.surfaceContainerLow,
  },
});

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  column: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
});
