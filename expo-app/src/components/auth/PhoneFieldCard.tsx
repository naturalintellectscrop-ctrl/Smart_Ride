// ============================================
// SMART RIDE MOBILE - PHONE FIELD CARD
// ============================================
// FieldCard with the country chip from the reference: flag, dial code, a
// chevron that opens the picker, then a divider and the subscriber input.
//
// Replaces the three different phone treatments that existed: a static
// "+256 / UG" View in phone-login, a `prefix="+256"` text in register, and
// plain free-text inputs in the rider and merchant wizards.
// ============================================

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FieldCard } from './FieldCard';
import { UgFlag } from './UgFlag';
import { CountryCodePicker, Country, UGANDA } from './CountryCodePicker';
import { TYPOGRAPHY, SPACING, BORDER } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';
import { sanitizePhoneInput } from '../../utils/phone';

interface PhoneFieldCardProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string | null;
  editable?: boolean;
  autoFocus?: boolean;
  returnKeyType?: 'done' | 'next' | 'go' | 'send';
  onSubmitEditing?: () => void;
  inputRef?: React.Ref<TextInput>;
  style?: ViewStyle;
}

export function PhoneFieldCard({
  label = 'Phone Number',
  value,
  onChangeText,
  onBlur,
  placeholder = '700 000 000',
  error,
  editable = true,
  autoFocus,
  returnKeyType,
  onSubmitEditing,
  inputRef,
  style,
}: PhoneFieldCardProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [country, setCountry] = useState<Country>(UGANDA);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Strip anything that cannot be part of a number. Validation itself happens
  // on blur or submit, never mid-typing — see src/utils/phone.ts.
  const handleChange = useCallback(
    (text: string) => onChangeText(sanitizePhoneInput(text)),
    [onChangeText]
  );

  const prefix = (
    <View style={styles.prefix}>
      <TouchableOpacity
        style={styles.countryChip}
        onPress={() => setPickerOpen(true)}
        disabled={!editable}
        accessibilityRole="button"
        accessibilityLabel={`Country: ${country.name}, ${country.dialCode}. Change country`}
      >
        <UgFlag size={22} />
        <Text style={styles.dialCode}>{country.dialCode}</Text>
        <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
      </TouchableOpacity>
      <View style={styles.divider} />
    </View>
  );

  return (
    <>
      <FieldCard
        label={label}
        icon="call-outline"
        inputPrefix={prefix}
        error={error}
        style={style}
        value={value}
        onChangeText={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        editable={editable}
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        inputRef={inputRef}
        maxLength={14}
      />

      <CountryCodePicker
        visible={pickerOpen}
        onDismiss={() => setPickerOpen(false)}
        onSelect={setCountry}
        selected={country}
      />
    </>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    prefix: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    countryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs + 2,
    },
    dialCode: {
      ...TYPOGRAPHY.bodyMd,
      color: COLORS.onSurface,
      fontWeight: '600',
    },
    divider: {
      width: BORDER.hairline,
      height: 22,
      backgroundColor: COLORS.outlineVariant,
      marginHorizontal: SPACING.gutter,
    },
  });
