// ============================================
// SMART RIDE MOBILE - GLASS CARD (compat wrapper)
// ============================================
// DEPRECATED name — kept so existing call sites keep working. It now delegates
// to the canonical <Card> primitive so every card in the app renders through
// one system. New code should import { Card } from './Card' directly.
//
// The old 'default'/'elevated'/'accent'/'cyan' variants map onto Card's
// 'raised'/'elevated'/'accent' with identical visuals (no regression).
// ============================================

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { SPACING, RADIUS } from '../constants';
import { Card, CardVariant } from './Card';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'accent' | 'cyan';
  padding?: number;
  borderRadius?: number;
  noBorder?: boolean;
}

const VARIANT_MAP: Record<NonNullable<GlassCardProps['variant']>, CardVariant> = {
  default: 'raised',
  elevated: 'elevated',
  accent: 'accent',
  cyan: 'accent',
};

export function GlassCard({
  children,
  style,
  variant = 'default',
  padding = SPACING.md,
  borderRadius = RADIUS.xl,
  noBorder = false,
}: GlassCardProps) {
  return (
    <Card variant={VARIANT_MAP[variant]} padding={padding} radius={borderRadius} noBorder={noBorder} style={style}>
      {children}
    </Card>
  );
}
