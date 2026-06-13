// ============================================
// SMART RIDE MOBILE - GLOW HEADER COMPONENT
// ============================================
// Stitch Design System — Material Design 3
// Light mode header with subtle bottom border
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../constants';

interface GlowHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    badge?: number;
  };
  style?: ViewStyle;
  titleStyle?: TextStyle;
  children?: React.ReactNode;
}

export function GlowHeader({
  title,
  subtitle,
  rightAction,
  style,
  titleStyle,
  children,
}: GlowHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md || 56 }]}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, titleStyle]}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {rightAction && (
            <View style={styles.rightActions}>
              <Ionicons
                name={rightAction.icon}
                size={24}
                color={COLORS.onSurfaceVariant}
                onPress={rightAction.onPress}
              />
              {rightAction.badge !== undefined && rightAction.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {rightAction.badge > 99 ? '99+' : rightAction.badge}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        {children}
      </View>
      {/* Subtle bottom border */}
      <View style={styles.bottomBorder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingHorizontal: SPACING.containerMargin,
    paddingBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.headlineLgMobile,
    color: COLORS.onBackground,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  rightActions: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: COLORS.onError,
    fontSize: 10,
    fontWeight: 'bold',
  },
  bottomBorder: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
  },
});
