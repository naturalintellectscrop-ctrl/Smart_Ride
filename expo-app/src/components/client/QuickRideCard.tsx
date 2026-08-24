// ============================================
// SMART RIDE MOBILE - QUICK RIDE CARD
// ============================================
// A one-tap booking entry: vehicle plate, name over the starting fare, and a
// circular go button. Two sit side by side under the Quick Ride heading.
//
// The fare is passed in from RIDE_TYPES by the caller so home can never quote
// a price the booking screen disagrees with.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER, ICON, OPACITY } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

interface QuickRideCardProps {
  name: string;
  /** Already formatted, e.g. "UGX 2,000". */
  fromFare: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  style?: ViewStyle;
}

export function QuickRideCard({ name, fromFare, icon, onPress, style }: QuickRideCardProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={OPACITY.pressed}
      accessibilityRole="button"
      accessibilityLabel={`Book ${name}, from ${fromFare}`}
    >
      <View style={styles.plate}>
        <Ionicons name={icon} size={ICON.lg} color={COLORS.primary} />
      </View>

      {/* No trailing arrow button. Two of these sit side by side, so at 390pt
          each card has ~150pt of inner width; a 44pt plate plus a 32pt arrow
          left ~65pt for the text and truncated every label to "Smart ...".
          The whole card is already the button, so the arrow was the redundant
          element to cut rather than the name. */}
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.15}>
          {name}
        </Text>
        <Text style={styles.fare} numberOfLines={1} maxFontSizeMultiplier={1.15}>
          <Text style={styles.fareLabel}>From </Text>
          {fromFare}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      padding: SPACING.gutter,
      borderRadius: RADIUS.lg,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.border,
      backgroundColor: COLORS.cardSurface,
    },
    plate: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.tintSurface,
      flexShrink: 0,
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
    },
    fare: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.primary,
      fontWeight: '600',
    },
    fareLabel: {
      color: COLORS.textMuted,
      fontWeight: '400',
    },
  });
