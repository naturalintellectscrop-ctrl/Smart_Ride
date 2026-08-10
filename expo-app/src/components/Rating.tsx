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
  // An unrated driver must not render as a fabricated "5.00". The API already
  // distinguishes the two — `/riders/profile` returns `rating: null` until at
  // least one real rating exists, precisely because `Rider.rating` defaults to
  // 5.0 — and `formatRating` in utils/money honours that. This component did
  // not, so the same unrated driver read "New" in one place and "5.00" in
  // another on the same screen.
  const unrated = value == null || (count != null && count <= 0);
  const v = (value ?? 0).toFixed(2);

  if (unrated) {
    return (
      <View style={[styles.row, style]} accessibilityLabel="Not yet rated">
        <Ionicons name="star-outline" size={iconSize} color={COLORS.onSurfaceVariant} />
        <Text style={{ fontSize, fontWeight: '700', color: COLORS.onSurfaceVariant }}>New</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.row, style]}
      accessibilityLabel={`Rated ${v} out of 5${count != null ? `, from ${count} ${count === 1 ? 'rating' : 'ratings'}` : ''}`}
    >
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
