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
import { GRADIENTS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function GradientButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
  fullWidth = true,
  size = 'md',
}: GradientButtonProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const sizeStyle = getSizeStyle(size);
  const isDisabled = disabled || loading;

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        style={[styles.outlineButton, sizeStyle, isDisabled && styles.disabled, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="small" />
        ) : (
          <>
            {icon}
            <Text style={styles.outlineText}>{title}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        style={[styles.secondaryButton, sizeStyle, isDisabled && styles.disabled, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.onSurface} size="small" />
        ) : (
          <>
            {icon}
            <Text style={styles.secondaryText}>{title}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  // Primary and Danger use gradient
  const colors = variant === 'danger' ? GRADIENTS.danger : GRADIENTS.primary;

  return (
    <TouchableOpacity
      style={[styles.buttonWrapper, fullWidth && styles.fullWidth, isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <LinearGradient
        colors={colors as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, sizeStyle]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            {icon}
            <Text style={styles.text}>{title}</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
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
