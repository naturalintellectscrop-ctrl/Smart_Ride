// ============================================
// SMART RIDE MOBILE - CARD (canonical surface primitive)
// ============================================
// The ONE Smart Ride card system. Every card in the app — information, ride,
// merchant, wallet, stat, notification, receipt, order, history — should be a
// <Card>, so surface colour, elevation, radius and press feedback stay
// identical everywhere.
//
// Not glassmorphism: a solid, theme-aware surface with a soft, tokenised
// shadow. Pass `onPress` to make it a tappable card — it gets a subtle motion
// press-scale (MOTION.spring.press) so interactive cards feel alive without
// bespoke animation code per screen.
//
//   <Card>…</Card>                       // default: raised
//   <Card variant="flat">…</Card>        // grouped rows, no shadow
//   <Card variant="elevated">…</Card>    // floating / modal surfaces
//   <Card onPress={go}>…</Card>          // tappable, animated press
//
// Two things were quietly off-system here and are now fixed:
//
//   1. Colour source. This read `useTheme().colors`, the palette in
//      theme-context.tsx, while every screen around it reads
//      makeThemedColors(). Those two disagree — `border` is #bec9bf in one and
//      the outlineVariant in the other, and the dark elevated surface is
//      #2e3132 vs #242827 — so every card sat a shade off the surface it was
//      placed on. Both now come from makeThemedColors.
//
//   2. Default radius. RADIUS.xl (24) predates the shape rule, which puts
//      cards at RADIUS.lg (16); xl is the sheet/pill radius. Callers that
//      passed RADIUS.xl explicitly have been normalised, so the default now
//      matches what the rule says a card is.
// ============================================

import React from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SPACING, RADIUS, SHADOWS, MOTION, BORDER } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors } from '../theme/themedColors';

export type CardVariant = 'flat' | 'raised' | 'elevated' | 'accent';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
  padding?: number;
  radius?: number;
  noBorder?: boolean;
  /** When set the card is tappable and animates on press. */
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function Card({
  children,
  style,
  variant = 'raised',
  padding = SPACING.md,
  radius = RADIUS.lg,
  noBorder = false,
  onPress,
  disabled,
  accessibilityLabel,
}: CardProps) {
  const { isDark } = useTheme();
  const COLORS = React.useMemo(() => makeThemedColors(isDark), [isDark]);

  // `accent` is the brand-tinted card (wallet strip, highlighted notices);
  // everything else is the plain card surface.
  const backgroundColor = variant === 'accent' ? COLORS.tintSurface : COLORS.cardSurface;
  const shadow = variant === 'elevated' ? SHADOWS.active : variant === 'flat' ? null : SHADOWS.card;

  const surface: StyleProp<ViewStyle> = [
    shadow,
    {
      backgroundColor,
      padding,
      borderRadius: radius,
      borderWidth: noBorder ? 0 : BORDER.hairline,
      borderColor: variant === 'accent' ? COLORS.hairlineSoft : COLORS.border,
    },
    style,
  ];

  if (!onPress) {
    return <View style={surface}>{children}</View>;
  }

  return <PressableCard surface={surface} onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel}>{children}</PressableCard>;
}

function PressableCard({
  surface,
  onPress,
  disabled,
  accessibilityLabel,
  children,
}: {
  surface: StyleProp<ViewStyle>;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => { scale.value = withSpring(MOTION.pressScale, MOTION.spring.press); }}
        onPressOut={() => { scale.value = withSpring(1, MOTION.spring.press); }}
        style={surface}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default Card;
