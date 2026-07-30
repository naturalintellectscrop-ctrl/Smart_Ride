// ============================================
// SMART RIDE — BottomNav (presentational)
// ============================================
// A Material-3 style bottom navigation bar for the client / rider / merchant
// shells. Presentational only — it renders items and reports taps; wiring it
// to expo-router is done at shell level (screen migration, not this phase).
// Active item shows a filled icon + green label + a soft indicator pill.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, ICON, BORDER } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

export interface NavItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;       // idle (outline)
  iconActive?: keyof typeof Ionicons.glyphMap; // active (filled)
  badge?: React.ReactNode;
}

interface BottomNavProps {
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  style?: ViewStyle;
}

export function BottomNav({ items, activeKey, onSelect, style }: BottomNavProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }, style]}>
      {items.map((item) => {
        const active = item.key === activeKey;
        const icon = active ? (item.iconActive ?? item.icon) : item.icon;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.item}
            onPress={() => onSelect(item.key)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
          >
            <View style={[styles.indicator, active && styles.indicatorActive]}>
              <Ionicons name={icon} size={ICON.lg} color={active ? COLORS.primary : COLORS.onSurfaceVariant} />
              {item.badge}
            </View>
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: COLORS.backgroundElevated,
    borderTopWidth: BORDER.hairline, borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.sm, paddingHorizontal: SPACING.xs,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  indicator: { minWidth: 56, height: 30, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  indicatorActive: { backgroundColor: COLORS.primaryContainer + '22' },
  label: { fontSize: 11, fontWeight: '600', color: COLORS.onSurfaceVariant },
  labelActive: { color: COLORS.primary, fontWeight: '700' },
});
