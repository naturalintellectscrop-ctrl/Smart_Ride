// ============================================
// SMART RIDE MOBILE - GRADIENT BUTTON COMPONENT
// ============================================
// Brand gradient button matching admin dashboard
// ============================================

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../constants';

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
  const sizeStyle = getSizeStyle(size);
  const isDisabled = disabled || loading;

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        style={[styles.outlineButton, sizeStyle, isDisabled && styles.disabled, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
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
      >
        {loading ? (
          <ActivityIndicator color={COLORS.textSecondary} size="small" />
        ) : (
          <>
            {icon}
            <Text style={styles.secondaryText}>{title}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  const colors = variant === 'danger' ? GRADIENTS.danger : GRADIENTS.primary;

  return (
    <TouchableOpacity
      style={[styles.buttonWrapper, fullWidth && styles.fullWidth, isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={colors as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, sizeStyle]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'danger' ? '#FFFFFF' : COLORS.background} size="small" />
        ) : (
          <>
            {icon}
            <Text style={[styles.text, variant === 'danger' && styles.textWhite]}>{title}</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function getSizeStyle(size: string): ViewStyle {
  switch (size) {
    case 'sm':
      return { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 };
    case 'lg':
      return { paddingVertical: 18, paddingHorizontal: 28, borderRadius: 14 };
    default:
      return { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 };
  }
}

const styles = StyleSheet.create({
  buttonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
  },
  outlineText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  secondaryText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
