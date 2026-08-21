// ============================================
// SMART RIDE MOBILE - AUTH HEADLINE
// ============================================
// The two-tone display headline every auth screen opens with:
//
//   Create your          ← lead, in ink
//   account              ← accent, in brand green
//   ▬▬  ·                ← accent rule
//   Join Smart Ride and enjoy safe, reliable rides…
//
// Keep `lead` and `accent` to two or three words each. The lineHeight in
// TYPOGRAPHY.displayXl reserves descender room for the `y` in "your" and the
// `g` in "Sign in"; do not tighten it here.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { TYPOGRAPHY, SPACING, RADIUS, AUTH } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

interface AuthHeadlineProps {
  /** First line, rendered in the ink colour. */
  lead: string;
  /** Second line, rendered in brand green. */
  accent: string;
  subtitle?: string;
  style?: ViewStyle;
}

export function AuthHeadline({ lead, accent, subtitle, style }: AuthHeadlineProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={style}>
      {/* The display size is capped: at a 1.3x system font scale a 32pt
          headline wraps to three lines and pushes the form off-screen. */}
      <Text
        style={styles.lead}
        accessibilityRole="header"
        accessibilityLabel={`${lead} ${accent}`}
        maxFontSizeMultiplier={1.2}
      >
        {lead}
      </Text>
      <Text style={styles.accent} maxFontSizeMultiplier={1.2}>{accent}</Text>

      <View style={styles.rule}>
        <View style={styles.ruleBar} />
        <View style={styles.ruleDot} />
      </View>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    lead: {
      ...TYPOGRAPHY.displayXl,
      color: COLORS.onSurface,
    },
    accent: {
      ...TYPOGRAPHY.displayXl,
      color: COLORS.primary,
    },
    rule: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginTop: SPACING.gutter,
    },
    ruleBar: {
      width: AUTH.accentRule.width,
      height: AUTH.accentRule.height,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
    },
    ruleDot: {
      width: AUTH.accentRule.height,
      height: AUTH.accentRule.height,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
    },
    subtitle: {
      ...TYPOGRAPHY.bodyMd,
      color: COLORS.onSurfaceVariant,
      marginTop: SPACING.md,
      maxWidth: 320,
    },
  });
