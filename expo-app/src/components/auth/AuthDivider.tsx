// ============================================
// SMART RIDE MOBILE - AUTH DIVIDER
// ============================================
// Hairline with a centred word, between the primary CTA and the social row.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { TYPOGRAPHY, SPACING, BORDER } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

interface AuthDividerProps {
  label?: string;
  style?: ViewStyle;
}

export function AuthDivider({ label = 'OR', style }: AuthDividerProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.row, style]}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
    },
    line: {
      flex: 1,
      height: BORDER.hairline,
      backgroundColor: COLORS.outlineVariant,
    },
    label: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.textMuted,
    },
  });
