// ============================================
// SMART RIDE MOBILE - GRADIENT BUTTON COMPONENT
// ============================================
// Stitch Design System — Material Design 3
// Primary: bg-primary, rounded-xl/full, h-14
// Secondary: bg-surface, border-outlineVariant
// Outline: border-primary
// Theme-aware: resolves colors for light/dark via makeThemedColors.
// ============================================

import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { GRADIENTS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY, MOTION } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

// Every button shares one press language with cards (MOTION.spring.press),
// so a tap feels the same everywhere in the app.
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
  /** Where `icon` sits relative to the label. The auth CTAs read "Create
   *  Account →", so they need the icon trailing. Defaults to leading. */
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** 'pill' fully rounds the button. The auth surface uses pill for every CTA
   *  and social button; cards and fields stay at RADIUS.lg. */
  shape?: 'rounded' | 'pill';
}

export function GradientButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  size = 'md',
  shape = 'rounded',
}: GradientButtonProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const sizeStyle = getSizeStyle(size);
  const shapeStyle = shape === 'pill' ? { borderRadius: RADIUS.full } : null;
  const isDisabled = disabled || loading;

  // One label renderer for all four variants so icon placement stays consistent.
  const renderContent = (textStyle: object) => (
    <>
      {iconPosition === 'left' && icon}
      <Text style={textStyle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{title}</Text>
      {iconPosition === 'right' && icon}
    </>
  );

  // Shared press-scale so buttons animate like Cards do.
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pressProps = {
    onPressIn: () => { if (!isDisabled) scale.value = withSpring(MOTION.pressScale, MOTION.spring.press); },
    onPressOut: () => { scale.value = withSpring(1, MOTION.spring.press); },
  };

  if (variant === 'outline') {
    return (
      <AnimatedTouchable
        style={[styles.outlineButton, sizeStyle, shapeStyle, isDisabled && styles.disabled, pressStyle, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        {...pressProps}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="small" />
        ) : (
          renderContent(styles.outlineText)
        )}
      </AnimatedTouchable>
    );
  }

  if (variant === 'secondary') {
    return (
      <AnimatedTouchable
        style={[styles.secondaryButton, sizeStyle, shapeStyle, isDisabled && styles.disabled, pressStyle, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        {...pressProps}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.onSurface} size="small" />
        ) : (
          renderContent(styles.secondaryText)
        )}
      </AnimatedTouchable>
    );
  }

  // Primary and Danger use gradient
  const colors = variant === 'danger' ? GRADIENTS.danger : GRADIENTS.primary;

  return (
    <AnimatedTouchable
      style={[styles.buttonWrapper, shapeStyle, fullWidth && styles.fullWidth, isDisabled && styles.disabled, pressStyle, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.9}
      {...pressProps}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <LinearGradient
        colors={colors as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, sizeStyle, shapeStyle]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          renderContent(styles.text)
        )}
      </LinearGradient>
    </AnimatedTouchable>
  );
}

function getSizeStyle(size: string): ViewStyle {
  switch (size) {
    case 'sm':
      return { paddingVertical: SPACING.sm + 4, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md };
    case 'lg':
      return { paddingVertical: SPACING.md + 2, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.xl, minHeight: 56 };
    default:
      return { paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.xl };
  }
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  buttonWrapper: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.button,
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  text: {
    ...TYPOGRAPHY.labelLg,
    // Gradient backgrounds are the same dark-green brand gradient in both
    // themes, so the label stays white for contrast in both.
    color: '#FFFFFF',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.xl,
  },
  outlineText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.primary,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.xl,
  },
  secondaryText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
  },
  disabled: {
    opacity: 0.5,
  },
});
