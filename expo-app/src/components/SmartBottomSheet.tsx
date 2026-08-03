// ============================================
// SMART RIDE — SmartBottomSheet
// ============================================
// Canonical bottom sheet primitive: rounded-26 top, grabber, drag-dismiss,
// `slow` + `gentle` spring, scrim overlay. Used for booking options, incoming
// requests, top-up/withdraw, attachments.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ViewStyle, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
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
}

export function SmartBottomSheet({
  visible,
  title,
  onDismiss,
  children,
  style,
  contentStyle,
  maxHeight,
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
      onRequestClose={onDismiss}
    >
      <Animated.View entering={FadeIn.duration(MOTION.base)} exiting={FadeOut.duration(MOTION.fast)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        
        <Animated.View
          entering={SlideInUp.damping(20).mass(0.9).springify()}
          exiting={FadeOut.duration(MOTION.fast)}
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

          {/* Content */}
          <View style={[styles.content, contentStyle]}>
            {children}
          </View>
        </Animated.View>
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
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl + 2,
    borderTopRightRadius: RADIUS.xl + 2,
    maxHeight: '80%',
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
