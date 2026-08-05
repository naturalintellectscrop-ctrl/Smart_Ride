// ============================================
// SMART RIDE — OnlinePill
// ============================================
// The availability switch for operational roles (Driver, Merchant, Pharmacy).
// A compact track with a sliding knob and a state word, so "am I taking work
// right now?" is answerable at a glance without reading a button label.
//
// Named in Golden Screen #13 and the DS component-usage map; it lived inline in
// the driver dashboard before this, which meant merchant and pharmacy would
// each have grown their own copy.
// ============================================

import React, { useEffect, useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { RADIUS, SHADOWS, MOTION, OPACITY } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

const TRACK_W = 84;
const TRACK_H = 34;
const KNOB = 26;
const INSET = 4;
const TRAVEL = TRACK_W - KNOB - INSET * 2;

interface OnlinePillProps {
  isOnline: boolean;
  onToggle: () => void;
  /** Words for the two states — merchants read "OPEN/CLOSED" more naturally. */
  labels?: { on: string; off: string };
  disabled?: boolean;
  style?: ViewStyle;
}

export function OnlinePill({
  isOnline,
  onToggle,
  labels = { on: 'ONLINE', off: 'OFFLINE' },
  disabled = false,
  style,
}: OnlinePillProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const p = useSharedValue(isOnline ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(isOnline ? 1 : 0, {
      duration: MOTION.duration.base,
      easing: Easing.bezier(...MOTION.easing.standard),
    });
  }, [isOnline]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * TRAVEL }] }));

  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={OPACITY.pressed}
      accessibilityRole="switch"
      accessibilityState={{ checked: isOnline, disabled }}
      accessibilityLabel={isOnline ? labels.on : labels.off}
      style={[styles.pill, isOnline && styles.pillOn, disabled && styles.pillDisabled, style]}
    >
      <Animated.View style={[styles.knob, isOnline && styles.knobOn, knob]} />
      <Text style={[styles.label, isOnline ? styles.labelOn : styles.labelOff]}>
        {isOnline ? labels.on : labels.off}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  pill: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerHigh,
    justifyContent: 'center',
    paddingHorizontal: INSET,
    ...SHADOWS.card,
  },
  pillOn: { backgroundColor: COLORS.primary },
  pillDisabled: { opacity: OPACITY.disabled },
  knob: {
    position: 'absolute',
    left: INSET,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: COLORS.onSurfaceVariant,
  },
  knobOn: { backgroundColor: COLORS.onPrimary },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginLeft: 8,
  },
  labelOn: { color: COLORS.onPrimary },
  labelOff: { color: COLORS.onSurfaceVariant },
});
