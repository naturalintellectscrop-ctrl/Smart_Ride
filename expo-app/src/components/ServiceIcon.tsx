// ============================================
// SMART RIDE MOBILE - SERVICE ICON COMPONENT
// ============================================
// Service icon container matching admin dashboard
// Pattern: w-10/w-14 rounded-xl bg-{color}-500/10 border-{color}-500/20
// ============================================

import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SERVICES } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors } from '../theme/themedColors';

interface ServiceIconProps {
  service: keyof typeof SERVICES | 'custom';
  size?: 'sm' | 'md' | 'lg';
  customIcon?: keyof typeof Ionicons.glyphMap;
  customColor?: string;
  customEmoji?: string;
  style?: ViewStyle;
}

export function ServiceIcon({
  service,
  size = 'md',
  customIcon,
  customColor,
  customEmoji,
  style,
}: ServiceIconProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const serviceConfig = service !== 'custom' ? SERVICES[service] : null;
  const color = customColor
    || (isDark ? serviceConfig?.colorDark : serviceConfig?.color)
    || COLORS.primary;
  const iconSize = getIconSize(size);
  const containerSize = getContainerSize(size);
  const borderRadius = size === 'lg' ? 16 : size === 'md' ? 14 : 10;
  // Dark mode: pastel "dim" fills would glow on dark surfaces, so use a
  // translucent tint of the (brightened) service color instead.
  const backgroundColor = isDark
    ? `${color}26`
    : serviceConfig?.colorDim || `${color}15`;
  const borderColor = isDark
    ? `${color}3D`
    : serviceConfig?.colorBorder || `${color}25`;

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius,
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      {customEmoji ? (
        <Ionicons
          name={customEmoji as any}
          size={iconSize * 0.8}
          color={color}
        />
      ) : (
        <Ionicons
          name={(customIcon || serviceConfig?.icon || 'ellipse-outline') as any}
          size={iconSize}
          color={color}
        />
      )}
    </View>
  );
}

function getIconSize(size: string): number {
  switch (size) {
    case 'sm': return 16;
    case 'lg': return 28;
    default: return 22;
  }
}

function getContainerSize(size: string): number {
  switch (size) {
    case 'sm': return 36;
    case 'lg': return 56;
    default: return 44;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
