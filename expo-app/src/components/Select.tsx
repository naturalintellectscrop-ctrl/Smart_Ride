// ============================================
// SMART RIDE — Select
// ============================================
// Single-choice picker. Per DS spec §4 it opens a `SmartBottomSheet` of radio
// rows, **not** a native menu — a platform menu would render with platform
// chrome and break the one-product feel the moment a user changes a setting.
//
// Anatomy matches the field family: label → tappable field showing the current
// value → helper/error line. Options live in the sheet, so a long list scrolls
// in the sheet rather than pushing the form around.
//
//   <Select
//     label="Payment method"
//     value={method}
//     options={[{ value: 'CASH', label: 'Cash' }, …]}
//     onChange={setMethod}
//   />
// ============================================

import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS, ICON, BORDER, OPACITY } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';
import { SmartBottomSheet } from './SmartBottomSheet';
import { ListRow } from './ListRow';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** Secondary line in the option sheet — an account number, a description. */
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

interface SelectProps<T extends string> {
  options: SelectOption<T>[];
  value?: T;
  onChange: (value: T) => void;
  label?: string;
  /** Shown in the field when nothing is selected. */
  placeholder?: string;
  /** Sheet title; defaults to the field label. */
  sheetTitle?: string;
  error?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Select<T extends string>({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select an option',
  sheetTitle,
  error,
  disabled = false,
  style,
}: SelectProps<T>) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[styles.field, !!error && styles.fieldError, disabled && styles.fieldDisabled]}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        accessibilityLabel={`${label ?? 'Select'}. ${selected?.label ?? placeholder}`}
      >
        {selected?.icon ? (
          <Ionicons name={selected.icon} size={ICON.md} color={COLORS.onSurfaceVariant} />
        ) : null}
        <Text
          style={[styles.value, !selected && styles.placeholder]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={ICON.md} color={COLORS.onSurfaceVariant} />
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SmartBottomSheet
        visible={open}
        title={sheetTitle ?? label}
        onDismiss={() => setOpen(false)}
      >
        <View>
          {options.map((option, i) => {
            const active = option.value === value;
            return (
              <ListRow
                key={option.value}
                title={option.label}
                subtitle={option.description}
                icon={option.icon}
                iconColor={active ? COLORS.primary : COLORS.onSurfaceVariant}
                divider={i < options.length - 1}
                disabled={option.disabled}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                trailing={
                  active ? (
                    <Ionicons name="checkmark-circle" size={ICON.lg} color={COLORS.primary} />
                  ) : undefined
                }
              />
            );
          })}
        </View>
      </SmartBottomSheet>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  label: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 56,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    // Constant width like IconInput — changing it on state causes an Android
    // reflow that shifts the row.
    borderWidth: BORDER.emphasis,
    borderColor: 'transparent',
  },
  fieldError: {
    borderColor: COLORS.error,
  },
  fieldDisabled: {
    opacity: OPACITY.disabled,
  },
  value: {
    flex: 1,
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
  },
  placeholder: {
    color: COLORS.outlineVariant,
  },
  error: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.error,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
});
