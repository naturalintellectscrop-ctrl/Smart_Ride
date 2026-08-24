// ============================================
// SMART RIDE MOBILE - LOCATION PILL
// ============================================
// The "where you are" control under the greeting: a hug-content pill with a
// brand pin, the resolved address, and a chevron.
// ============================================

import React, { useMemo } from 'react';
import { Text, TouchableOpacity, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER, ICON, OPACITY } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

interface LocationPillProps {
  address?: string | null;
  loading?: boolean;
  onPress: () => void;
  /** Copy shown when there is no address yet. */
  placeholder?: string;
  style?: ViewStyle;
}

export function LocationPill({
  address,
  loading = false,
  onPress,
  placeholder = 'Tap to set location',
  style,
}: LocationPillProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <TouchableOpacity
      style={[styles.pill, style]}
      onPress={onPress}
      activeOpacity={OPACITY.pressed}
      accessibilityRole="button"
      accessibilityLabel={address ? `Current location: ${address}. Change location` : placeholder}
    >
      <Ionicons name="location" size={ICON.sm} color={COLORS.primary} />
      {loading ? (
        <ActivityIndicator color={COLORS.primary} size="small" />
      ) : (
        <Text style={styles.text} numberOfLines={1}>
          {address || placeholder}
        </Text>
      )}
      <Ionicons name="chevron-down" size={ICON.sm} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: SPACING.sm,
      minHeight: 44,
      maxWidth: '100%',
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.full,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surfaceContainerLow,
    },
    text: {
      ...TYPOGRAPHY.bodyMd,
      color: COLORS.onSurface,
      flexShrink: 1,
      minWidth: 0,
    },
  });
