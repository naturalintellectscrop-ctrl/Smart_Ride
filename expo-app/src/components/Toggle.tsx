// ============================================
// SMART RIDE — Toggle
// ============================================
// The on/off switch. DS spec §4 bans the bare React Native `<Switch>`
// ("**never** bare RN `<Switch>`") because it renders with platform colours and
// platform motion, so a settings screen stops looking like the rest of the app
// on both iOS and Android.
//
// Same knob-and-track language as `OnlinePill`, one size smaller and without the
// state word — `OnlinePill` answers "am I taking work?", `Toggle` answers
// "is this setting on?".
// ============================================

import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolateColor } from 'react-native-reanimated';
import { RADIUS, MOTION, OPACITY } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

const TRACK_W = 48;
const TRACK_H = 28;
const KNOB = 22;
const INSET = 3;
const TRAVEL = TRACK_W - KNOB - INSET * 2;

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Announced by screen readers — the setting this controls. */
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Toggle({ value, onValueChange, disabled = false, accessibilityLabel, style }: ToggleProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(value ? 1 : 0, {
      duration: MOTION.duration.instant,
      easing: Easing.bezier(...MOTION.easing.standard),
    });
  }, [value]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [COLORS.surfaceContainerHigh, COLORS.primary]),
  }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * TRAVEL }] }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      // The visible track is 28dp tall; extend the touch target to the 48dp minimum.
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      <Animated.View style={[styles.track, track, disabled && styles.disabled]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    paddingHorizontal: INSET,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: COLORS.onPrimary,
  },
  disabled: {
    opacity: OPACITY.disabled,
  },
});
