// ============================================
// SMART RIDE MOBILE - SMART RIDE MODAL
// ============================================
// Branded, theme-aware replacement for native Alert.alert() confirmation /
// message dialogs. Supports SUCCESS / WARNING / ERROR / INFORMATION states,
// dark mode, app typography + colours, and a smooth spring entrance.
// Rendered by <FeedbackHost/> from the feedback store queue.
// ============================================

import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';
import { useFeedbackStore, ModalConfig, FeedbackType, FeedbackButton } from './feedbackStore';

// Icon + accent colour per feedback state. Accent is resolved against the live
// theme so both light and dark modes look correct.
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

export function SmartRideModal({ config }: { config: ModalConfig }) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const dismissModal = useFeedbackStore((s) => s.dismissModal);

  const { icon, accent } = visualsFor(config.type, COLORS);

  const close = () => dismissModal(config.id);

  const handlePress = (btn: FeedbackButton) => {
    close();
    // Defer the callback so navigation/state changes run after the modal is gone.
    if (btn.onPress) setTimeout(btn.onPress, 0);
  };

  // Backdrop tap = cancel: invoke the cancel-styled button if present.
  const handleBackdrop = () => {
    if (!config.cancelable) return;
    const cancelBtn = config.buttons.find((b) => b.style === 'cancel');
    if (cancelBtn) handlePress(cancelBtn);
    else close();
  };

  const buttons = config.buttons.length ? config.buttons : [{ text: 'OK' }];
  // 3+ buttons stack vertically; 1–2 sit in a row.
  const stacked = buttons.length > 2;

  const buttonStyle = (btn: FeedbackButton, isOnly: boolean) => {
    if (btn.style === 'cancel') return { view: styles.btnCancel, text: styles.btnCancelText };
    if (btn.style === 'destructive') return { view: [styles.btnSolid, { backgroundColor: COLORS.error }], text: styles.btnSolidText };
    // Primary/default action uses the state accent so success is green, error red, etc.
    const bg = config.type === 'error' ? COLORS.error : accent;
    return { view: [styles.btnSolid, { backgroundColor: bg }], text: styles.btnSolidText };
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleBackdrop}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdrop} />
        <Animated.View entering={ZoomIn.springify().damping(18).mass(0.7)} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: `${accent}1A` }]}>
            <Ionicons name={icon} size={30} color={accent} />
          </View>

          <Text style={styles.title}>{config.title}</Text>
          {config.message ? <Text style={styles.message}>{config.message}</Text> : null}

          <View style={[styles.actions, stacked && styles.actionsStacked]}>
            {buttons.map((btn, i) => {
              const s = buttonStyle(btn, buttons.length === 1);
              return (
                <TouchableOpacity
                  key={`${btn.text || 'btn'}-${i}`}
                  style={[s.view, stacked && styles.btnFull]}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.85}
                >
                  <Text style={s.text} numberOfLines={1}>{btn.text || 'OK'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onSurface,
    textAlign: 'center',
    fontWeight: '700',
  },
  message: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm + 4,
    marginTop: SPACING.lg + 4,
    width: '100%',
  },
  actionsStacked: {
    flexDirection: 'column-reverse', // primary action ends up on top when stacked
  },
  btnFull: {
    width: '100%',
    flex: undefined as unknown as number,
  },
  btnSolid: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSolidText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onPrimary,
    fontWeight: '700',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.outline,
  },
  btnCancelText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
});
