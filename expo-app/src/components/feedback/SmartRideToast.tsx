// ============================================
// SMART RIDE MOBILE - SMART RIDE TOAST
// ============================================
// Lightweight, auto-dismissing branded toast for quick success/info/error
// feedback (the non-blocking counterpart to SmartRideModal). Dark-mode aware,
// slides in from the top with a coloured accent per state.
// ============================================

import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';
import { useFeedbackStore, ToastConfig, FeedbackType } from './feedbackStore';

function visualsFor(type: FeedbackType, COLORS: ThemedColors): { icon: keyof typeof Ionicons.glyphMap; accent: string } {
  switch (type) {
    case 'success':
      return { icon: 'checkmark-circle', accent: COLORS.primary };
    case 'warning':
      return { icon: 'warning', accent: COLORS.warning };
    case 'error':
      return { icon: 'alert-circle', accent: COLORS.error };
    case 'info':
    default:
      return { icon: 'information-circle', accent: COLORS.primary };
  }
}

function ToastItem({ config }: { config: ToastConfig }) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const dismissToast = useFeedbackStore((s) => s.dismissToast);
  const { icon, accent } = visualsFor(config.type, COLORS);

  useEffect(() => {
    const t = setTimeout(() => dismissToast(config.id), config.duration);
    return () => clearTimeout(t);
  }, [config.id, config.duration]);

  return (
    <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => dismissToast(config.id)}
        style={[styles.toast, { borderLeftColor: accent }]}
      >
        <Ionicons name={icon} size={22} color={accent} style={styles.icon} />
        <View style={styles.textWrap}>
          {config.title ? <Text style={styles.title} numberOfLines={1}>{config.title}</Text> : null}
          <Text style={styles.message} numberOfLines={3}>{config.message}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function SmartRideToastHost({ toasts }: { toasts: ToastConfig[] }) {
  if (toasts.length === 0) return null;
  return (
    <View style={hostStyles.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} config={t} />
      ))}
    </View>
  );
}

const hostStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: SPACING.sm,
    zIndex: 9999,
    paddingHorizontal: SPACING.md,
  },
});

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    paddingVertical: SPACING.md - 2,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: { marginRight: 2 },
  textWrap: { flex: 1 },
  title: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  message: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
});
