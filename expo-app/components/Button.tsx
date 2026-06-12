// ============================================
// SMART RIDE MOBILE - PREMIUM BUTTON
// ============================================
// Animated button with press feedback
// Matches admin dashboard button styling
// ============================================

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const COLORS = {
  primary: '#005f3a',
  primaryDark: '#00522f',
  accent: '#0e7a4d',
  background: '#f8f9fa',
  backgroundElevated: '#ffffff',
  text: '#191c1d',
  textSecondary: 'rgba(25, 28, 29, 0.7)',
  textMuted: '#6f7a71',
  border: '#bec9bf',
  error: '#F43F5E',
  success: '#22C55E',
  white: '#FFFFFF',
};

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: {
      backgroundColor: COLORS.primary,
    },
    text: {
      color: COLORS.background,
    },
  },
  secondary: {
    container: {
      backgroundColor: COLORS.backgroundElevated,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    text: {
      color: COLORS.text,
    },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: COLORS.primary,
    },
    text: {
      color: COLORS.primary,
    },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    text: {
      color: COLORS.text,
    },
  },
  danger: {
    container: {
      backgroundColor: COLORS.error,
    },
    text: {
      color: COLORS.text,
    },
  },
};

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    text: {
      fontSize: 14,
      fontWeight: '500',
    },
  },
  md: {
    container: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
    },
    text: {
      fontSize: 16,
      fontWeight: '600',
    },
  },
  lg: {
    container: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
    },
    text: {
      fontSize: 18,
      fontWeight: '600',
    },
  },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 5,
      tension: 300,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 300,
    }).start();
  };

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: fullWidth ? '100%' : 'auto' }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.9}
        style={[
          styles.container,
          variantStyles[variant].container,
          sizeStyles[size].container,
          isDisabled && styles.disabled,
          fullWidth && styles.fullWidth,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? COLORS.white : COLORS.primary}
          />
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            <Text
              style={[
                styles.text,
                variantStyles[variant].text,
                sizeStyles[size].text,
                icon && iconPosition === 'left' && styles.textWithLeftIcon,
                icon && iconPosition === 'right' && styles.textWithRightIcon,
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    textAlign: 'center',
  },
  textWithLeftIcon: {
    marginLeft: 8,
  },
  textWithRightIcon: {
    marginRight: 8,
  },
});

export default Button;
