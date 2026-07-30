// ============================================
// SMART RIDE — Chip
// ============================================
// Selectable pill for filters/categories (restaurants, orders, notifications).
// Active = filled brand green; idle = tonal surface. Full-radius, 48dp-safe row.
// ============================================

import React, { useMemo } from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, ICON, MOTION, OPACITY } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export function Chip({ label, active = false, onPress, icon, style }: ChipProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedTouchable
      style={[styles.chip, active && styles.chipActive, pressStyle, style]}
      onPress={onPress}
      activeOpacity={OPACITY.pressed}
      onPressIn={() => { scale.value = withSpring(MOTION.pressScale, MOTION.spring.press); }}
      onPressOut={() => { scale.value = withSpring(1, MOTION.spring.press); }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      {icon ? <Ionicons name={icon} size={ICON.sm} color={active ? COLORS.onPrimary : COLORS.onSurfaceVariant} /> : null}
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </AnimatedTouchable>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, height: 36, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  chipActive: { backgroundColor: COLORS.primary },
  text: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
  textActive: { color: COLORS.onPrimary },
});
