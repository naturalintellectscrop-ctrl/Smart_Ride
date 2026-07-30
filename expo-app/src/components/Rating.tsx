// ============================================
// SMART RIDE — Rating
// ============================================
// Star + tabular number (e.g. 4.96). Used on driver/provider/merchant cards.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ICON } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors } from '../theme/themedColors';

interface RatingProps {
  value?: number | null;
  count?: number | null; // optional "(128)" trip/review count
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Rating({ value, count, size = 'sm', style }: RatingProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const iconSize = size === 'md' ? ICON.md : ICON.xs;
  const fontSize = size === 'md' ? 15 : 12.5;
  const v = (value ?? 0).toFixed(2);
  return (
    <View style={[styles.row, style]} accessibilityLabel={`Rating ${v}${count != null ? `, ${count} trips` : ''}`}>
      <Ionicons name="star" size={iconSize} color={COLORS.warning} />
      <Text style={{ fontSize, fontWeight: '700', color: COLORS.onSurface }}>{v}</Text>
      {count != null ? (
        <Text style={{ fontSize: fontSize - 1, color: COLORS.onSurfaceVariant }}>({count})</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
