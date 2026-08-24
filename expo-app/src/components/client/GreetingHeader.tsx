// ============================================
// SMART RIDE MOBILE - GREETING HEADER
// ============================================
// The top of the client home: a muted greeting line over the reader's name in
// display weight, with a circular action button on the right that can carry an
// unread dot.
//
// This replaces AppHeader on home. AppHeader puts the title first and the
// subtitle under it, which inverts the reference (greeting reads first, name
// is the emphasis) and caps the name at headline size.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER, ICON, OPACITY } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

export interface GreetingHeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  /** Shows the small brand dot on the button. */
  badge?: boolean;
}

interface GreetingHeaderProps {
  /** "Good evening," — punctuation included by the caller. */
  greeting: string;
  /** The reader's first name, in display weight. */
  name: string;
  actions?: GreetingHeaderAction[];
  style?: ViewStyle;
}

export function GreetingHeader({ greeting, name, actions = [], style }: GreetingHeaderProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.row, style]}>
      <View style={styles.text}>
        <Text style={styles.greeting} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {greeting}
        </Text>
        <Text
          style={styles.name}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          accessibilityRole="header"
        >
          {name}
        </Text>
      </View>

      <View style={styles.actions}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.icon}
            style={styles.iconButton}
            onPress={action.onPress}
            activeOpacity={OPACITY.pressed}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Ionicons name={action.icon} size={ICON.lg} color={COLORS.onSurface} />
            {action.badge ? <View style={styles.badge} /> : null}
          </TouchableOpacity>
        ))}
      </View>
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
    text: {
      flex: 1,
      minWidth: 0,
    },
    greeting: {
      ...TYPOGRAPHY.bodyMd,
      color: COLORS.onSurfaceVariant,
    },
    name: {
      ...TYPOGRAPHY.displayXl,
      color: COLORS.onSurface,
    },
    actions: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    iconButton: {
      width: 48,
      height: 48,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: BORDER.hairline,
      borderColor: COLORS.border,
      backgroundColor: COLORS.cardSurface,
    },
    badge: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 9,
      height: 9,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
      borderWidth: 1.5,
      borderColor: COLORS.cardSurface,
    },
  });
