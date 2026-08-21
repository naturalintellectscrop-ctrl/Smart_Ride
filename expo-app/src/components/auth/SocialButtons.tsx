// ============================================
// SMART RIDE MOBILE - SOCIAL BUTTONS
// ============================================
// The "OR" row's two-up grid of alternative sign-in routes. These buttons
// were hand-rolled twice, verbatim, in login.tsx and register.tsx.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleIcon } from './GoogleIcon';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER, AUTH, OPACITY } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

interface SocialButtonsProps {
  onGoogle: () => void;
  googleLoading?: boolean;
  onPhone?: () => void;
  /** Label for the second slot. */
  phoneLabel?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function SocialButtons({
  onGoogle,
  googleLoading = false,
  onPhone,
  phoneLabel = 'Continue with Phone',
  disabled = false,
  style,
}: SocialButtonsProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.row, style]}>
      <TouchableOpacity
        style={[styles.button, (disabled || googleLoading) && styles.disabled]}
        onPress={onGoogle}
        disabled={disabled || googleLoading}
        activeOpacity={OPACITY.pressed}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ disabled: disabled || googleLoading, busy: googleLoading }}
      >
        {googleLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <>
            <GoogleIcon size={20} />
            <Text style={styles.label} numberOfLines={1}>
              Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      {onPhone ? (
        <TouchableOpacity
          style={[styles.button, disabled && styles.disabled]}
          onPress={onPhone}
          disabled={disabled}
          activeOpacity={OPACITY.pressed}
          accessibilityRole="button"
          accessibilityLabel={phoneLabel}
          accessibilityState={{ disabled }}
        >
          <Ionicons name="call" size={18} color={COLORS.primary} />
          <Text style={styles.label} numberOfLines={1}>
            Phone
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: SPACING.gutter,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      minHeight: AUTH.ctaHeight - 4,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.full,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.border,
      backgroundColor: COLORS.authCard,
    },
    label: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
    },
    disabled: {
      opacity: OPACITY.disabled,
    },
  });
