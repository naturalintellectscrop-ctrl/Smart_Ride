// ============================================
// SMART RIDE MOBILE - GLASS CARD COMPONENT
// ============================================
// Stitch Design System — Material Design 3
// Light mode surface container cards with shadow
// ============================================

import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { SPACING, RADIUS, SHADOWS } from '../constants';
import { useTheme } from '../context/theme-context';

interface GlassCardProps {
  children: React.ReactNode;
  // StyleProp (not bare ViewStyle) so callers can pass style arrays.
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'accent' | 'cyan';
  padding?: number;
  borderRadius?: number;
  noBorder?: boolean;
}

// Theme-aware card. In light mode it matches the old static surfaces exactly
// (no regression); in dark mode it uses dark surfaces so any screen's themed
// text stays readable on the card without needing per-card overrides.
export function GlassCard({
  children,
  style,
  variant = 'default',
  padding = SPACING.md,
  borderRadius = RADIUS.xl,
  noBorder = false,
}: GlassCardProps) {
  const { colors } = useTheme();
  // light: backgroundElevated=#ffffff, backgroundSecondary=#edeeef (== old values)
  const backgroundColor = variant === 'accent' || variant === 'cyan'
    ? colors.backgroundSecondary
    : colors.backgroundElevated;

  return (
    <View
      style={[
        variant === 'elevated' ? SHADOWS.active : SHADOWS.card,
        { backgroundColor, padding, borderRadius, borderWidth: noBorder ? 0 : 1, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}
