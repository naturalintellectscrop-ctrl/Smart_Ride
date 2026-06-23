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
import { TYPOGRAPHY, SPACING } from '../constants';
import { useTheme } from '../context/theme-context';

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
  const { colors } = useTheme();

  return (
    <View style={[{ backgroundColor: colors.background }, style]}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md || 56 }]}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }, titleStyle]}>{title}</Text>
            {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
          </View>
          {rightAction && (
            <View style={styles.rightActions}>
              <Ionicons
                name={rightAction.icon}
                size={24}
                color={colors.textSecondary}
                onPress={rightAction.onPress}
              />
              {rightAction.badge !== undefined && rightAction.badge > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.error }]}>
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
      <View style={[styles.bottomBorder, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
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
    letterSpacing: -0.5,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySm,
    marginTop: 2,
  },
  rightActions: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bottomBorder: {
    height: 1,
  },
});
