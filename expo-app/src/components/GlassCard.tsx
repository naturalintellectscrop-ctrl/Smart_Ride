// ============================================
// SMART RIDE MOBILE - GLASS CARD COMPONENT
// ============================================
// Stitch Design System — Material Design 3
// Light mode surface container cards with shadow
// ============================================

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'accent' | 'cyan';
  padding?: number;
  borderRadius?: number;
  noBorder?: boolean;
}

export function GlassCard({ 
  children, 
  style, 
  variant = 'default', 
  padding = SPACING.md,
  borderRadius = RADIUS.xl,
  noBorder = false,
}: GlassCardProps) {
  const variantStyle = getVariantStyle(variant);

  return (
    <View
      style={[
        styles.card,
        { padding, borderRadius },
        variantStyle,
        noBorder && styles.noBorder,
        style,
      ]}
    >
      {children}
    </View>
  );
}

function getVariantStyle(variant: string): ViewStyle {
  switch (variant) {
    case 'elevated':
      return {
        backgroundColor: COLORS.surfaceContainerLowest,
        ...SHADOWS.active,
        borderColor: COLORS.outlineVariant,
        borderWidth: 1,
      };
    case 'accent':
      return {
        backgroundColor: COLORS.surfaceContainerLow,
        borderColor: COLORS.outlineVariant,
        borderWidth: 1,
      };
    case 'cyan':
      return {
        backgroundColor: COLORS.surfaceContainerLow,
        borderColor: COLORS.outlineVariant,
        borderWidth: 1,
      };
    default:
      return {};
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  noBorder: {
    borderWidth: 0,
  },
});
