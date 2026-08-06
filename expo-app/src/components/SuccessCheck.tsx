// ============================================
// SMART RIDE — SuccessCheck
// ============================================
// The one "it worked" mark (DS gap #10). Every success moment — top-up,
// withdrawal, payment, trip complete, document submitted — uses this, so
// confirmation always reads the same way instead of each screen inventing its
// own green circle.
//
// Choreography (MOTION.success): the ring scales in, then the check appears
// inside it. Two beats, not one, so the eye lands on the mark rather than the
// whole thing arriving at once.
//
//   <SuccessCheck />                       // just the mark
//   <SuccessCheck title="Top-up sent" />   // mark + message block
// ============================================

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, MOTION } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

type SuccessSize = 'md' | 'lg';

const DIMENSIONS: Record<SuccessSize, { ring: number; icon: number }> = {
  md: { ring: 64, icon: 32 },
  lg: { ring: 96, icon: 48 },
};

interface SuccessCheckProps {
  size?: SuccessSize;
  /** Headline under the mark — omit for the bare mark. */
  title?: string;
  /** Supporting line under the title. */
  subtitle?: string;
  style?: ViewStyle;
}

export function SuccessCheck({ size = 'md', title, subtitle, style }: SuccessCheckProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { ring, icon } = DIMENSIONS[size];

  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0.4);
  const checkOpacity = useSharedValue(0);

  useEffect(() => {
    const easing = Easing.bezier(...MOTION.easing.decelerate);
    ringOpacity.value = withTiming(1, { duration: MOTION.success.ringIn, easing });
    ringScale.value = withTiming(1, { duration: MOTION.success.ringIn, easing });
    // The check waits for the ring to land, so the two beats stay legible.
    checkOpacity.value = withDelay(
      MOTION.success.ringIn,
      withTiming(1, { duration: MOTION.success.checkDraw, easing }),
    );
    checkScale.value = withDelay(
      MOTION.success.ringIn,
      withTiming(1, { duration: MOTION.success.checkDraw, easing }),
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <View
      style={[styles.wrap, style]}
      accessibilityRole="image"
      accessibilityLabel={title ? `Success. ${title}` : 'Success'}
    >
      <Animated.View
        style={[
          styles.ring,
          { width: ring, height: ring, borderRadius: ring / 2 },
          ringStyle,
        ]}
      >
        <Animated.View style={checkStyle}>
          <Ionicons name="checkmark" size={icon} color={COLORS.onPrimary} />
        </Animated.View>
      </Animated.View>

      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  ring: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onSurface,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});
