// ============================================
// SMART RIDE — SmartBottomSheet
// ============================================
// Canonical bottom sheet primitive: rounded-26 top, grabber, drag-dismiss,
// `slow` + `gentle` spring, scrim overlay. Used for booking options, incoming
// requests, top-up/withdraw, attachments.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, ViewStyle, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';
import { SPACING, RADIUS, MOTION } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

interface SmartBottomSheetProps {
  visible: boolean;
  title?: string;
  onDismiss: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  maxHeight?: number; // default: 80% of screen
  /**
   * Whether tapping the scrim (or the Android back button) dismisses the sheet.
   * Set false for sheets whose dismissal is a real decision — an incoming ride
   * offer must not be declined by a stray tap next to the sheet.
   */
  dismissOnBackdrop?: boolean;
}

export function SmartBottomSheet({
  visible,
  title,
  onDismiss,
  children,
  style,
  contentStyle,
  maxHeight,
  dismissOnBackdrop = true,
}: SmartBottomSheetProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissOnBackdrop ? onDismiss : undefined}
    >
      {/* Durations live under MOTION.duration.*; MOTION.base/MOTION.fast were
          undefined, so these animations had no duration. */}
      <Animated.View entering={FadeIn.duration(MOTION.duration.base)} exiting={FadeOut.duration(MOTION.duration.fast)} style={styles.backdrop}>
        {dismissOnBackdrop ? <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} /> : null}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
          pointerEvents="box-none"
        >
        <Animated.View
          entering={SlideInUp.damping(20).mass(0.9).springify()}
          exiting={FadeOut.duration(MOTION.duration.fast)}
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, SPACING.sm) },
            style,
          ]}
        >
          {/* Grabber */}
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>

          {/* Header (optional) */}
          {title && (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
          )}

          {/* Content.
              Scrollable and keyboard-aware because sheets carry forms (top-up,
              withdraw, pickers). Without this a focused field sits behind the
              keyboard on both platforms — the bespoke modals these replaced
              each had their own KeyboardAvoidingView, so the behaviour belongs
              here rather than in every caller. */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl + 2,
    borderTopRightRadius: RADIUS.xl + 2,
    maxHeight: '80%',
  },
  scroll: {
    flexGrow: 0,
  },
  grabberWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.outlineVariant,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
});
