// ============================================
// SMART RIDE — ResizablePanel
// ============================================
// The operations panel on the AR-3 map screens (ride request, ride tracking,
// driver dashboard). It sits over the map with a rounded top and a grabber.
//
// The grabber was decorative and the panel was a fixed `flex: 1.2`, so a rider
// could not trade map for detail: on a small phone the trip form was cramped
// and its text wrapped, and on any phone the map could not be enlarged to see
// where the driver actually was. The grabber is now a real handle — drag to
// resize between snap points, release to settle at the nearest.
//
// This is the inline sibling of `SmartBottomSheet`'s snap behaviour. They stay
// separate because this panel is part of the screen (never modal, never
// dismissible, always visible) whereas the sheet is presented over it.
// ============================================

import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { SPACING, RADIUS } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

/** Fractions of screen height the panel settles at, smallest first. */
const SNAP_FRACTIONS = {
  peek: 0.26,
  half: 0.48,
  full: 0.88,
} as const;

export type PanelSnap = keyof typeof SNAP_FRACTIONS;

interface ResizablePanelProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  /** Heights the panel settles at. Defaults to all three. */
  snapPoints?: PanelSnap[];
  /** Which snap the panel starts at. Defaults to `half`. */
  initialSnap?: PanelSnap;
  /** Called when the panel settles, so a screen can resize its map padding. */
  onSnapChange?: (snap: PanelSnap) => void;
}

export function ResizablePanel({
  children,
  style,
  snapPoints = ['peek', 'half', 'full'],
  initialSnap = 'half',
  onSnapChange,
}: ResizablePanelProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { height: screenHeight } = useWindowDimensions();

  // Ascending snap heights, paired with their names so a settle can be
  // reported back to the screen.
  const stops = useMemo(() => {
    const ordered = (['peek', 'half', 'full'] as PanelSnap[]).filter(s => snapPoints.includes(s));
    const list = (ordered.length ? ordered : (['half'] as PanelSnap[])).map(s => ({
      snap: s,
      height: screenHeight * SNAP_FRACTIONS[s],
    }));
    return list.sort((a, b) => a.height - b.height);
  }, [snapPoints, screenHeight]);

  const startHeight = useMemo(
    () => screenHeight * SNAP_FRACTIONS[snapPoints.includes(initialSnap) ? initialSnap : 'half'],
    [screenHeight, initialSnap, snapPoints],
  );

  const height = useSharedValue(startHeight);
  const dragStart = useSharedValue(startHeight);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          dragStart.value = height.value;
        })
        .onUpdate(e => {
          // Dragging up (negative translationY) grows the panel.
          const next = dragStart.value - e.translationY;
          const min = stops[0].height;
          const max = stops[stops.length - 1].height;
          // Clamped rather than rubber-banded: this panel is never dismissible,
          // so overshoot past the smallest stop would suggest an action that
          // does not exist.
          height.value = Math.min(Math.max(next, min), max);
        })
        .onEnd(e => {
          // Project the fling so a deliberate flick advances a whole step
          // instead of springing back to where the drag started.
          const projected = height.value - e.velocityY * 0.12;
          let nearest = stops[0];
          for (const s of stops) {
            if (Math.abs(s.height - projected) < Math.abs(nearest.height - projected)) nearest = s;
          }
          height.value = withSpring(nearest.height, {
            damping: 20,
            mass: 0.9,
            velocity: -e.velocityY,
          });
          if (onSnapChange) runOnJS(onSnapChange)(nearest.snap);
        }),
    [stops, height, dragStart, onSnapChange],
  );

  const animatedStyle = useAnimatedStyle(() => ({ height: height.value }));

  const resizable = stops.length > 1;

  const grabber = (
    <View
      style={styles.grabberWrap}
      accessibilityRole={resizable ? 'adjustable' : undefined}
      accessibilityLabel={resizable ? 'Resize panel' : undefined}
      accessibilityHint={resizable ? 'Swipe up or down to change the panel height' : undefined}
    >
      <View style={styles.grabber} />
    </View>
  );

  return (
    <Animated.View style={[styles.panel, animatedStyle, style]}>
      {resizable ? <GestureDetector gesture={gesture}>{grabber}</GestureDetector> : grabber}
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  panel: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl + 2,
    borderTopRightRadius: RADIUS.xl + 2,
    marginTop: -(RADIUS.xl + 2),
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  grabberWrap: {
    alignItems: 'center',
    // A 4px pill is far under the 44px minimum touch target, so the padded
    // wrapper — not the pill — is what the finger actually has to hit.
    paddingVertical: SPACING.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.outlineVariant,
  },
});
