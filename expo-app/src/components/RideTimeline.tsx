// ============================================
// SMART RIDE — RideTimeline
// ============================================
// Status stepper: vertical line with circular milestones. Used in Active Ride,
// Merchant/Pharmacy order status, and receipts. One step per status.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

export interface TimelineStep {
  id: string;
  status: 'completed' | 'active' | 'pending';
  label: string;
  subtitle?: string;
  timestamp?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface RideTimelineProps {
  steps: TimelineStep[];
  style?: ViewStyle;
}

export function RideTimeline({ steps, style }: RideTimelineProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.timeline, style]}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCompleted = step.status === 'completed';
        const isActive = step.status === 'active';

        return (
          <View key={step.id} style={styles.step}>
            {/* Vertical line (skip last) */}
            {!isLast && (
              <View
                style={[
                  styles.line,
                  isCompleted && styles.lineCompleted,
                  isActive && styles.lineActive,
                ]}
              />
            )}

            {/* Milestone circle */}
            <View
              style={[
                styles.milestone,
                isCompleted && styles.milestoneCompleted,
                isActive && styles.milestoneActive,
              ]}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={16} color={COLORS.onPrimary} />
              ) : step.icon ? (
                <Ionicons name={step.icon} size={16} color={isActive ? COLORS.primary : COLORS.onSurfaceVariant} />
              ) : null}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text
                style={[
                  styles.label,
                  isCompleted && styles.labelCompleted,
                  isActive && styles.labelActive,
                ]}
              >
                {step.label}
              </Text>
              {step.subtitle && (
                <Text style={styles.subtitle}>{step.subtitle}</Text>
              )}
              {step.timestamp && (
                <Text style={styles.timestamp}>{step.timestamp}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  timeline: {
    gap: SPACING.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  line: {
    position: 'absolute',
    left: 19, // center of 40px circle
    top: 40,
    width: 2,
    height: 60,
    backgroundColor: COLORS.outlineVariant,
  },
  lineCompleted: {
    backgroundColor: COLORS.primary,
  },
  lineActive: {
    backgroundColor: COLORS.primary,
  },
  milestone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  milestoneCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  milestoneActive: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  content: {
    flex: 1,
    paddingTop: 2,
    gap: SPACING.xs,
  },
  label: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurfaceVariant,
  },
  labelCompleted: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  labelActive: {
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  subtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  timestamp: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outlineVariant,
  },
});
