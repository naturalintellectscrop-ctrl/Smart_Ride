// ============================================
// SMART RIDE — AppHeader
// ============================================
// The one canonical header (replaces per-screen headers + legacy GlowHeader).
// Variants: 'compact' (back + title + optional right action) and 'large'
// (editorial title + subtitle). Safe-area aware.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, ICON } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

interface HeaderAction { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; badge?: React.ReactNode; label?: string }

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  variant?: 'compact' | 'large';
  onBack?: () => void; // renders a back button when provided
  rightActions?: HeaderAction[];
  /**
   * Arbitrary control rendered before the icon actions — the operational
   * dashboards (Driver, Merchant, Pharmacy) put their `OnlinePill` here.
   */
  rightSlot?: React.ReactNode;
  style?: ViewStyle;
}

export function AppHeader({ title, subtitle, variant = 'compact', onBack, rightActions, rightSlot, style }: AppHeaderProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 12) + 6 }, style]}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.iconButton} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={ICON.lg} color={COLORS.onSurface} />
          </TouchableOpacity>
        ) : null}
        {variant === 'compact' ? (
          <View style={styles.compactTitleBlock}>
            {subtitle ? <Text style={styles.compactSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
            {/* Shrink before clipping: "Merchant Dashboard" beside an OPEN pill and
                a bell was being cut to "Merchant Dashb…". */}
            <Text style={styles.compactTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{title}</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View style={styles.actions}>
          {rightSlot}
          {rightActions?.map((a, i) => (
            <TouchableOpacity key={i} onPress={a.onPress} style={styles.iconButton} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={a.label ?? a.icon}>
              <Ionicons name={a.icon} size={ICON.md} color={COLORS.onSurface} />
              {a.badge}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {variant === 'large' ? (
        <View style={styles.largeBlock}>
          <Text style={styles.largeTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{title}</Text>
          {subtitle ? <Text style={styles.largeSubtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  wrap: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 44 },
  iconButton: { width: 44, height: 44, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceContainerLow },
  compactTitleBlock: { flex: 1, minWidth: 0 },
  compactTitle: { fontSize: 20, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.2 },
  compactSubtitle: { fontSize: 13, fontWeight: '500', color: COLORS.onSurfaceVariant },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  largeBlock: { marginTop: SPACING.sm },
  largeTitle: { fontSize: 28, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.3 },
  largeSubtitle: { fontSize: 14, color: COLORS.onSurfaceVariant, marginTop: 2 },
});
