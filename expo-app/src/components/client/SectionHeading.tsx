// ============================================
// SMART RIDE MOBILE - SECTION HEADING
// ============================================
// Display-weight section title with an optional muted subtitle underneath and
// an optional trailing action ("View all").
//
// SectionHeader in StateViews.tsx is the older, smaller variant used inside
// lists; this one carries the client tabs' top-level sections, where the title
// is a piece of page structure rather than a list label.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { TYPOGRAPHY, SPACING } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function SectionHeading({
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: SectionHeadingProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.textBlock}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: SPACING.gutter,
      marginBottom: SPACING.gutter,
    },
    textBlock: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      ...TYPOGRAPHY.headlineLg,
      color: COLORS.onSurface,
    },
    subtitle: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
      marginTop: 2,
    },
    action: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.primary,
      marginTop: 4,
    },
  });
