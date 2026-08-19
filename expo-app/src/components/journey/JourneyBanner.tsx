// ============================================
// SMART RIDE — JourneyBanner
// ============================================
// In-panel notice. Two shapes:
//
//   <JourneyBanner error={translated} onAction={…} />   a translated failure
//   <JourneyBanner tone="info" title=… message=… />     a hint or nudge
//
// Errors arrive already translated by taskErrors.ts, so a raw state-machine
// string cannot reach this component even by accident — it takes a JourneyError,
// not a string.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY, ICON } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';
import type { JourneyError } from './taskErrors';

export type BannerTone = 'info' | 'success' | 'warning' | 'error';

const TONE_ICON: Record<BannerTone, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'alert-circle',
  error: 'close-circle',
};

interface JourneyBannerProps {
  /** A translated failure. Supplies tone, copy and the recovery label. */
  error?: JourneyError | null;
  /** Invoked when the user takes the error's recovery action. */
  onAction?: () => void;
  /** Dismiss handler. Omit for banners the user should not be able to hide. */
  onDismiss?: () => void;

  // Plain-notice form.
  tone?: BannerTone;
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;

  style?: ViewStyle;
}

export function JourneyBanner({
  error,
  onAction,
  onDismiss,
  tone,
  title,
  message,
  icon,
  style,
}: JourneyBannerProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  // An error that has taken the task away from this user is more serious than
  // one they can retry through, and should read that way.
  const resolvedTone: BannerTone = error
    ? error.taskStillActive
      ? 'warning'
      : 'error'
    : (tone ?? 'info');

  const resolvedTitle = error?.title ?? title;
  const resolvedMessage = error?.message ?? message;
  const actionLabel = error?.actionLabel;

  if (!resolvedTitle && !resolvedMessage) return null;

  const accent =
    resolvedTone === 'error'
      ? COLORS.error
      : resolvedTone === 'warning'
        ? COLORS.warning
        : resolvedTone === 'success'
          ? COLORS.success
          : COLORS.info;

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: `${accent}14`, borderColor: `${accent}40` },
        style,
      ]}
      accessibilityRole="alert"
    >
      <Ionicons
        name={icon ?? TONE_ICON[resolvedTone]}
        size={ICON.md}
        color={accent}
        style={styles.icon}
      />
      <View style={styles.body}>
        {!!resolvedTitle && (
          <Text style={[styles.title, { color: accent }]}>{resolvedTitle}</Text>
        )}
        {!!resolvedMessage && <Text style={styles.message}>{resolvedMessage}</Text>}

        {!!actionLabel && !!onAction && (
          <TouchableOpacity
            onPress={onAction}
            style={styles.actionButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={[styles.actionText, { color: accent }]}>{actionLabel}</Text>
            <Ionicons name="arrow-forward" size={ICON.xs} color={accent} />
          </TouchableOpacity>
        )}
      </View>

      {!!onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Ionicons name="close" size={ICON.sm} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.sm,
      padding: SPACING.md,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
    },
    icon: {
      marginTop: 1,
    },
    body: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...TYPOGRAPHY.labelLg,
      fontWeight: '700',
    },
    message: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurface,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      marginTop: SPACING.sm,
    },
    actionText: {
      ...TYPOGRAPHY.labelLg,
      fontWeight: '700',
    },
  });
