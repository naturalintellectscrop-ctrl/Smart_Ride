// ============================================
// SMART RIDE MOBILE - CONFIRM DIALOG
// ============================================
// A branded, theme-aware confirmation popup to replace the bare system
// Alert.alert() dialogs. Rounded card, Smart Ride colours, dark-mode aware,
// with an optional destructive style for actions like "Cancel Ride".
// ============================================

import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const accent = destructive ? COLORS.error : COLORS.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {icon ? (
            <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
              <Ionicons name={icon} size={26} color={accent} />
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading} activeOpacity={0.8}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: accent }]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color={COLORS.onPrimary} size="small" /> : <Text style={styles.confirmText}>{confirmLabel}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg + 4,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  message: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm + 4,
    marginTop: SPACING.lg + 4,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.outline,
  },
  cancelText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  confirmText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onPrimary,
    fontWeight: '700',
  },
});
