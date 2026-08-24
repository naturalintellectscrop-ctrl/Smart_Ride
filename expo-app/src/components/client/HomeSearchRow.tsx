// ============================================
// SMART RIDE MOBILE - HOME SEARCH ROW
// ============================================
// The destination entry point: a wide non-editable search affordance that
// opens the booking flow, plus a circular button for recent destinations.
//
// It is deliberately NOT a live text field. Typing here would have to be
// forwarded into the booking screen's own search anyway, so this hands off on
// tap and lets one screen own destination search.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER, ICON, OPACITY } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

interface HomeSearchRowProps {
  placeholder?: string;
  onPress: () => void;
  /** Omit to hide the recents button. */
  onRecents?: () => void;
  style?: ViewStyle;
}

export function HomeSearchRow({
  placeholder = 'Where do you want to go?',
  onPress,
  onRecents,
  style,
}: HomeSearchRowProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.row, style]}>
      <TouchableOpacity
        style={styles.field}
        onPress={onPress}
        activeOpacity={OPACITY.pressed}
        accessibilityRole="search"
        accessibilityLabel={placeholder}
      >
        <Ionicons name="search" size={ICON.md} color={COLORS.textMuted} />
        <Text style={styles.placeholder} numberOfLines={1}>
          {placeholder}
        </Text>
      </TouchableOpacity>

      {onRecents ? (
        <TouchableOpacity
          style={styles.recents}
          onPress={onRecents}
          activeOpacity={OPACITY.pressed}
          accessibilityRole="button"
          accessibilityLabel="Recent destinations"
        >
          <Ionicons name="time-outline" size={ICON.md} color={COLORS.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.gutter,
    },
    field: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      minHeight: 56,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.lg,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surfaceContainerLow,
    },
    placeholder: {
      ...TYPOGRAPHY.bodyMd,
      color: COLORS.textMuted,
      flexShrink: 1,
    },
    recents: {
      width: 56,
      height: 56,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: BORDER.hairline,
      borderColor: COLORS.border,
      backgroundColor: COLORS.tintSurface,
      flexShrink: 0,
    },
  });
