// ============================================
// SMART RIDE — SegmentedControl
// ============================================
// Single-select segmented control (ride options, earnings/revenue periods).
// One track, a sliding brand-green indicator, equal segments. Replaces the
// hand-rolled "chip row" pattern with a real primitive.
// ============================================

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { RADIUS, SPACING, MOTION, BORDER } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

export interface Segment<T extends string> { value: T; label: string }

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string>({ segments, value, onChange, style }: SegmentedControlProps<T>) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [trackW, setTrackW] = useState(0);
  const idx = Math.max(0, segments.findIndex((s) => s.value === value));
  const segW = trackW > 0 ? (trackW - 8) / segments.length : 0; // 4px inset each side

  const x = useSharedValue(0);
  x.value = withTiming(idx * segW, { duration: MOTION.duration.base, easing: Easing.bezier(...MOTION.easing.standard) });
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: segW }));

  const onLayout = (e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width);

  return (
    <View style={[styles.track, style]} onLayout={onLayout}>
      {segW > 0 ? <Animated.View style={[styles.indicator, indicator]} /> : null}
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <TouchableOpacity key={s.value} style={styles.segment} onPress={() => onChange(s.value)} activeOpacity={0.85} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={s.label}>
            {/* Shrink rather than clip. Four segments split the track equally, so
                labels like "Preparing 2" and "Completed" were being cut to
                "Prepari…" and "Compl…" — which reads as a rendering fault
                rather than a tab. */}
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  track: {
    flexDirection: 'row', backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.full, padding: 4, height: 44,
    borderWidth: BORDER.hairline, borderColor: COLORS.borderLight,
  },
  indicator: {
    position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  label: { fontSize: 13.5, fontWeight: '600', color: COLORS.onSurfaceVariant },
  labelActive: { color: COLORS.onPrimary },
});
