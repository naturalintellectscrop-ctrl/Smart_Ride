// ============================================
// SMART RIDE MOBILE - SKELETON COMPONENTS
// ============================================
// Animated loading placeholders for list screens
// Uses Reanimated for smooth pulse animation
// ============================================

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors } from '@/src/theme/themedColors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
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
        { backgroundColor: COLORS.surfaceContainerHigh },
        { width, height, borderRadius } as any,
        animatedStyle,
        style,
      ]}
    />
  );
}

// Pre-built skeleton layouts
function SkeletonCard({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  return (
    <View style={[skeletonStyles.card, { backgroundColor: COLORS.surfaceContainer }]}>
      {children}
    </View>
  );
}

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
    <SkeletonCard>
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
    </SkeletonCard>
  );
}

export function OrderSkeleton() {
  return (
    <SkeletonCard>
      <Skeleton width="50%" height={16} />
      <Skeleton width="80%" height={12} style={{ marginTop: 6 }} />
      <View style={skeletonStyles.rowBetween}>
        <Skeleton width={100} height={14} />
        <Skeleton width={60} height={20} borderRadius={10} />
      </View>
    </SkeletonCard>
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
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
});
