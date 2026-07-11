// ============================================
// SMART RIDE MOBILE - ICON INPUT COMPONENT
// ============================================
// Stitch Design System — Material Design 3
// Light mode, surface-container-low bg, primary focus ring
//
// CURSOR JUMPING FIX (Android):
// On Android, ANY state change during text input causes a re-render
// that shifts the cursor position. This component is deliberately
// simplified to avoid ALL re-renders during typing:
//   - No useState for focus tracking (useRef instead)
//   - No dynamic style changes on focus (static border)
//   - No icon color changes on focus
//   - borderWidth is ALWAYS 1.5 (never changes)
//   - borderColor is ALWAYS transparent (never changes on focus)
// =============================================================

import React, { useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

interface IconInputProps {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  editable?: boolean;
  style?: ViewStyle;
  multiline?: boolean;
  error?: string;
  returnKeyType?: 'done' | 'next' | 'go' | 'search' | 'send';
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
}

export function IconInput({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
  style,
  multiline = false,
  error,
  returnKeyType = 'done',
  onSubmitEditing,
  autoFocus = false,
}: IconInputProps) {
  // Theme colors are stable during typing (only change on theme toggle),
  // so memoized styles preserve the no-recalculation guarantee below.
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  // Use REF for focus tracking — does NOT cause re-renders
  // (useState causes re-renders that make the cursor jump on Android)
  const inputRef = useRef<TextInput>(null);

  // Stable callbacks — no inline functions that change on every render
  const handleFocus = useCallback(() => {
    // Deliberately does nothing — no state updates during focus
    // On Android, setState during focus causes cursor jump
  }, []);

  const handleBlur = useCallback(() => {
    // Deliberately does nothing
  }, []);

  // Determine static border color — no dynamic changes
  const borderColor = error ? COLORS.error : 'transparent';

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, { borderColor }]}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            // Static color — no focus-based changes (prevents re-render)
            color={COLORS.outline}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            !icon && styles.inputNoIcon,
            multiline && styles.multilineInput,
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.outlineVariant}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          blurOnSubmit={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          maxFontSizeMultiplier={1}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={20} color={COLORS.outline} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    // Border is ALWAYS present with same width — only color changes (error vs default)
    // NEVER change borderWidth on focus — that causes cursor jump on Android
    borderWidth: 1.5,
    paddingHorizontal: SPACING.md,
  },
  leftIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingRight: SPACING.sm,
    paddingLeft: 0,
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    minHeight: 56,
    paddingVertical: SPACING.md,
  },
  inputNoIcon: {
    paddingLeft: 0,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: SPACING.md,
  },
  rightIcon: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  errorText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.error,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
});
