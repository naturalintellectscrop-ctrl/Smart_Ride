// ============================================
// SMART RIDE MOBILE - PASSWORD STRENGTH
// ============================================
// Segmented meter plus the inline requirement chips from the reference. Sits
// in a FieldCard's `footer` slot.
//
// The rules come from src/utils/password.ts, which mirrors the server's
// validatePasswordStrength. Three divergent copies used to live in
// register.tsx, reset-password.tsx and change-password.tsx.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';
import { getPasswordStrength, requirementsFor } from '../../utils/password';

interface PasswordStrengthProps {
  password: string;
  /** Pass the confirm value to include the "Passwords match" rule. */
  confirm?: string;
  style?: ViewStyle;
}

export function PasswordStrength({ password, confirm, style }: PasswordStrengthProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const strength = useMemo(
    () => getPasswordStrength(password, confirm),
    [password, confirm]
  );
  const requirements = useMemo(
    () => requirementsFor(confirm !== undefined),
    [confirm]
  );

  // One colour ramp: weak reads as error, mid as warning, complete as brand.
  const meterColor =
    strength.met === 0
      ? COLORS.outlineVariant
      : strength.met === strength.total
      ? COLORS.primary
      : strength.met <= 2
      ? COLORS.error
      : COLORS.warning;

  return (
    <View style={style}>
      <View
        style={styles.meter}
        accessibilityRole="progressbar"
        accessibilityLabel={
          strength.label
            ? `Password strength: ${strength.label}`
            : 'Password strength'
        }
      >
        {requirements.map((req, index) => (
          <View
            key={req.key}
            style={[
              styles.segment,
              { backgroundColor: index < strength.met ? meterColor : COLORS.outlineVariant },
            ]}
          />
        ))}
      </View>

      {/* No separator rules between the chips. The reference fits all of them
          on one line on a wide artboard; at 390pt they wrap, and a wrapped
          row would start a line with a dangling divider. Spacing separates
          them instead. */}
      <View style={styles.chips}>
        {requirements.map((req) => {
          const met = strength.results[req.key];
          return (
            <View key={req.key} style={styles.chip}>
              <Ionicons
                name={met ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={met ? COLORS.primary : COLORS.outlineVariant}
              />
              <Text style={[styles.chipText, met && styles.chipTextMet]}>
                {req.shortLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    meter: {
      flexDirection: 'row',
      gap: SPACING.xs + 2,
    },
    segment: {
      flex: 1,
      height: 4,
      borderRadius: RADIUS.full,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginTop: SPACING.sm + 2,
      rowGap: SPACING.xs + 2,
      columnGap: SPACING.gutter,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs + 1,
    },
    chipText: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.textMuted,
    },
    chipTextMet: {
      color: COLORS.onSurfaceVariant,
    },
  });
