// ============================================
// SMART RIDE — SearchInput
// ============================================
// The one search field (AR-4 lists, destination search, chat/merchant search).
// Leading search glyph, optional inline spinner while a query is in flight, and
// a clear affordance once there is text. Debouncing belongs to the caller — this
// primitive only owns presentation.
//
// Follows IconInput's Android discipline: no state updates on focus/blur, and a
// border whose width never changes, so the cursor cannot jump while typing.
// ============================================

import React, { useMemo } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS, ICON, BORDER, OPACITY } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Shows an inline spinner in place of the clear button. */
  loading?: boolean;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
  editable?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search',
  loading = false,
  onSubmitEditing,
  autoFocus = false,
  editable = true,
  style,
  accessibilityLabel,
}: SearchInputProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name="search" size={ICON.md} color={COLORS.onSurfaceVariant} style={styles.leadingIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.outlineVariant}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        editable={editable}
        blurOnSubmit={false}
        maxFontSizeMultiplier={1}
        accessibilityLabel={accessibilityLabel ?? placeholder}
      />
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} style={styles.trailing} />
      ) : value.length > 0 ? (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          style={styles.trailing}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={OPACITY.pressed}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={ICON.md} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    borderWidth: BORDER.hairline,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
  },
  leadingIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    paddingVertical: SPACING.gutter,
  },
  trailing: {
    marginLeft: SPACING.sm,
  },
});
