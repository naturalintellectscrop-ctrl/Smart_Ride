// ============================================
// SMART RIDE MOBILE - STATUS BADGE COMPONENT
// ============================================
// Status pill matching admin dashboard
// Pattern: bg-{color}-500/20 text-{color}-400 border-{color}-500/30
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../constants';

interface StatusBadgeProps {
  label: string;
  color?: string;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export function StatusBadge({ label, color = COLORS.primary, style, size = 'sm' }: StatusBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        size === 'md' && styles.badgeMd,
        {
          backgroundColor: `${color}20`,
          borderColor: `${color}30`,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'md' && styles.textMd,
          { color },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 24,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  textMd: {
    fontSize: 13,
  },
});
