// ============================================
// SMART RIDE MOBILE - GLOW HEADER COMPONENT
// ============================================
// Dark header with gradient glow bottom border
// Replaces the solid green headers in tab screens
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS } from '../constants';

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
      <View style={[styles.header, { paddingTop: insets.top + 16 || 56 }]}>
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
                color={COLORS.textSecondary}
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
      {/* Gradient glow border at bottom */}
      <LinearGradient
        colors={['rgba(0, 255, 136, 0.3)', 'rgba(0, 212, 255, 0.1)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.glowBorder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
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
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  glowBorder: {
    height: 1,
  },
});
