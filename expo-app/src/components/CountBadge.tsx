// ============================================
// SMART RIDE — CountBadge
// ============================================
// Numeric unread/count badge (Chat list, Notifications, tab icons).
// Caps at 99+; a `dot` variant renders a bare presence dot.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../context/theme-context';
import { makeThemedColors } from '../theme/themedColors';

interface CountBadgeProps {
  count?: number;
  dot?: boolean;
  color?: string; // defaults to brand primary; pass error for alerts
  style?: ViewStyle;
}

export function CountBadge({ count = 0, dot = false, color, style }: CountBadgeProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const bg = color ?? COLORS.primary;

  if (dot) {
    return <View style={[styles.dot, { backgroundColor: bg, borderColor: COLORS.surface }, style]} />;
  }
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: COLORS.surface }, style]} accessibilityLabel={`${label} unread`}>
      <Text style={[styles.text, { color: COLORS.onPrimary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  text: { fontSize: 11, fontWeight: '800' },
});
