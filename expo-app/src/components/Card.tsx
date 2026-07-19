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
// ============================================

import React from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SPACING, RADIUS, SHADOWS, MOTION } from '../constants';
import { useTheme } from '../context/theme-context';

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
  radius = RADIUS.xl,
  noBorder = false,
  onPress,
  disabled,
  accessibilityLabel,
}: CardProps) {
  const { colors } = useTheme();

  const backgroundColor = variant === 'accent' ? colors.backgroundSecondary : colors.backgroundElevated;
  const shadow = variant === 'elevated' ? SHADOWS.active : variant === 'flat' ? null : SHADOWS.card;

  const surface: StyleProp<ViewStyle> = [
    shadow,
    {
      backgroundColor,
      padding,
      borderRadius: radius,
      borderWidth: noBorder ? 0 : 1,
      borderColor: colors.border,
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
