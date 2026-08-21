// ============================================
// SMART RIDE MOBILE - STEP RAIL
// ============================================
// The multi-step header from the reference: numbered circles joined by a
// dashed connector, labels underneath, and an "n / total" counter at the right.
// Replaces the three different progress treatments that used to exist (two
// flex bars in register, a static "Step 1 of 2" pill in phone-login, and a
// percentage bar in the rider wizard).
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS, AUTH, BORDER } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors, withAlpha } from '../../theme/themedColors';

interface StepRailProps {
  /** 1-based. */
  current: number;
  /** Short labels, one per step. Length defines the number of steps. */
  labels: string[];
  style?: ViewStyle;
}

export function StepRail({ current, labels, style }: StepRailProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const total = labels.length;

  return (
    <View
      style={[styles.wrap, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}: ${labels[current - 1] ?? ''}`}
    >
      <View style={styles.rail}>
        {labels.map((label, index) => {
          const stepNumber = index + 1;
          const done = stepNumber < current;
          const active = stepNumber === current;

          return (
            <React.Fragment key={label}>
              {index > 0 ? (
                <View style={[styles.connector, done || active ? styles.connectorDone : null]} />
              ) : null}
              <View style={styles.step}>
                <View
                  style={[
                    styles.dot,
                    active && styles.dotActive,
                    done && styles.dotDone,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={14} color={COLORS.onPrimary} />
                  ) : (
                    <Text style={[styles.dotText, active && styles.dotTextActive]}>
                      {stepNumber}
                    </Text>
                  )}
                </View>
                <Text
                  style={[styles.label, (active || done) && styles.labelActive]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {label}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      <Text style={styles.counter} maxFontSizeMultiplier={1.2}>
        {current} / {total}
      </Text>
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
    },
    rail: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    step: {
      alignItems: 'center',
      // Shrinkable with minWidth 0 so a four-step rail on a 360dp screen
      // ellipsizes its labels instead of pushing the counter off the edge.
      flexShrink: 1,
      minWidth: 0,
      paddingHorizontal: 2,
    },
    dot: {
      width: AUTH.stepDot,
      height: AUTH.stepDot,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: BORDER.hairline,
      borderColor: COLORS.outlineVariant,
      backgroundColor: COLORS.surfaceContainerLowest,
    },
    dotActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    dotDone: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    dotText: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.textMuted,
    },
    dotTextActive: {
      color: COLORS.onPrimary,
      fontWeight: '700',
    },
    label: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.textMuted,
      marginTop: SPACING.xs + 2,
    },
    labelActive: {
      color: COLORS.primary,
      fontWeight: '600',
    },
    connector: {
      // Takes the slack the steps do not need, so a two-step rail gets the
      // long connector from the reference and a four-step rail gets a short one.
      flex: 1,
      minWidth: 8,
      maxWidth: 96,
      height: BORDER.hairline,
      marginTop: AUTH.stepDot / 2,
      marginHorizontal: SPACING.xs,
      // A dashed rule without a dashed-border hack: a thin bar at low alpha
      // reads the same at this size and costs nothing to render.
      backgroundColor: COLORS.outlineVariant,
    },
    connectorDone: {
      backgroundColor: withAlpha(COLORS.primary, 0.5),
    },
    counter: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
      marginTop: 3,
    },
  });
