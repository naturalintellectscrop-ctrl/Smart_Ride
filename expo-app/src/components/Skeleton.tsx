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

// ============================================
// Archetype presets (DS gap #13)
// ============================================
// One loading shape per archetype, so every list, detail and map screen loads
// the same way. Before these existed, screens hand-rolled a skeleton inline —
// `ride-tracking` and the driver dashboard each grew their own map-shaped one,
// which is exactly the drift these prevent.

/** AR-4 — a list of rows. `rows` defaults to a screenful. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={skeletonStyles.row}>
          <Skeleton width={40} height={40} borderRadius={RADIUS.md} />
          <View style={skeletonStyles.column}>
            <Skeleton width="65%" height={14} />
            <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** AR-5 — hero block, then grouped sections. */
export function DetailSkeleton() {
  return (
    <View style={skeletonStyles.detail}>
      <Skeleton width="55%" height={20} borderRadius={RADIUS.sm} />
      <Skeleton width="100%" height={120} borderRadius={RADIUS.xl} style={{ marginTop: SPACING.md }} />
      <Skeleton width="100%" height={80} borderRadius={RADIUS.xl} style={{ marginTop: SPACING.md }} />
      <Skeleton width="100%" height={56} borderRadius={RADIUS.full} style={{ marginTop: SPACING.lg }} />
    </View>
  );
}

/**
 * AR-3 — map workspace above, operations panel below. Holds the panel's real
 * shape (rounded-26 top + grabber) so arriving data does not shift the layout.
 */
export function MapSkeleton() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  return (
    <View style={skeletonStyles.mapRoot}>
      <View style={[skeletonStyles.mapArea, { backgroundColor: COLORS.surfaceContainerLow }]} />
      <View style={[skeletonStyles.mapPanel, { backgroundColor: COLORS.surface }]}>
        <View style={[skeletonStyles.grabber, { backgroundColor: COLORS.outlineVariant }]} />
        <Skeleton width="52%" height={20} borderRadius={RADIUS.sm} />
        <Skeleton width="100%" height={72} borderRadius={RADIUS.lg} style={{ marginTop: SPACING.md }} />
        <Skeleton width="100%" height={96} borderRadius={RADIUS.lg} style={{ marginTop: SPACING.md }} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  detail: {
    padding: SPACING.md,
  },
  mapRoot: {
    flex: 1,
  },
  mapArea: {
    flex: 1,
  },
  mapPanel: {
    flex: 1.2,
    borderTopLeftRadius: RADIUS.xl + 2,
    borderTopRightRadius: RADIUS.xl + 2,
    marginTop: -(RADIUS.xl + 2),
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginVertical: SPACING.sm,
  },
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
