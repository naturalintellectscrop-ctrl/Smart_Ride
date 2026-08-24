// ============================================
// SMART RIDE MOBILE - SERVICE TILE
// ============================================
// One entry in the home services rail: a brand-tinted icon plate above a bold
// name and a muted one-line description of what the service does.
//
// The rail scrolls horizontally rather than wrapping into a grid, so a sixth
// service can be added without re-flowing the row or shrinking the tiles below
// a comfortable tap target.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER, OPACITY } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

export const SERVICE_TILE_WIDTH = 104;

interface ServiceTileProps {
  name: string;
  /** One-line "what this does": "Get a ride", "Order food". */
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  style?: ViewStyle;
}

export function ServiceTile({ name, description, icon, onPress, style }: ServiceTileProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={OPACITY.pressed}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${description}`}
    >
      <View style={styles.plate}>
        <Ionicons name={icon} size={30} color={COLORS.primary} />
      </View>
      <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {name}
      </Text>
      <Text style={styles.description} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {description}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    card: {
      width: SERVICE_TILE_WIDTH,
      alignItems: 'center',
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.sm,
      borderRadius: RADIUS.lg,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.border,
      backgroundColor: COLORS.cardSurface,
    },
    plate: {
      width: 56,
      height: 56,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.tintSurface,
      marginBottom: SPACING.sm,
    },
    name: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
    },
    description: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.textMuted,
      marginTop: 1,
    },
  });
