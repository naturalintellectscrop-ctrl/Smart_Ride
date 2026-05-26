// ============================================
// SMART RIDE MOBILE - SERVICE ICON COMPONENT
// ============================================
// Service icon container matching admin dashboard
// Pattern: w-10/w-14 rounded-xl bg-{color}-500/10 border-{color}-500/20
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SERVICES } from '../constants';

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
  const serviceConfig = service !== 'custom' ? SERVICES[service] : null;
  const color = customColor || serviceConfig?.color || COLORS.primary;
  const iconSize = getIconSize(size);
  const containerSize = getContainerSize(size);
  const borderRadius = size === 'lg' ? 16 : size === 'md' ? 14 : 10;

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius,
          backgroundColor: serviceConfig?.colorDim || `${color}15`,
          borderColor: serviceConfig?.colorBorder || `${color}25`,
        },
        style,
      ]}
    >
      {customEmoji ? (
        <Text style={{ fontSize: iconSize * 0.8 }}>{customEmoji}</Text>
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
