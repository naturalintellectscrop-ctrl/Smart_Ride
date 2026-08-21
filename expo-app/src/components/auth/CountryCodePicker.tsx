// ============================================
// SMART RIDE MOBILE - COUNTRY CODE PICKER
// ============================================
// The sheet behind the chevron on the phone field.
//
// Uganda is the only selectable country, and that is deliberate rather than
// unfinished: api.sendOTP delivers through MTN and Airtel Uganda, so offering
// another dial code would produce a number the backend cannot send a code to.
// The sheet exists so the chevron in the reference design does something
// honest, and so the supported list has one place to grow.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SmartBottomSheet } from '../SmartBottomSheet';
import { ListRow } from '../ListRow';
import { UgFlag } from './UgFlag';
import { TYPOGRAPHY, SPACING } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';
import { UG_DIAL_CODE } from '../../utils/phone';

export interface Country {
  code: string;
  name: string;
  dialCode: string;
}

export const UGANDA: Country = { code: 'UG', name: 'Uganda', dialCode: UG_DIAL_CODE };

/** Everything the picker can offer today. */
export const SUPPORTED_COUNTRIES: Country[] = [UGANDA];

interface CountryCodePickerProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (country: Country) => void;
  selected?: Country;
}

export function CountryCodePicker({
  visible,
  onDismiss,
  onSelect,
  selected = UGANDA,
}: CountryCodePickerProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <SmartBottomSheet visible={visible} title="Country" onDismiss={onDismiss}>
      {SUPPORTED_COUNTRIES.map((country) => (
        <ListRow
          key={country.code}
          leading={<UgFlag size={26} />}
          title={country.name}
          subtitle={country.dialCode}
          onPress={() => {
            onSelect(country);
            onDismiss();
          }}
          trailing={
            selected.code === country.code ? (
              <Text style={styles.selected}>Selected</Text>
            ) : undefined
          }
          divider={false}
        />
      ))}

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Smart Ride sends verification codes through MTN and Airtel Uganda.
          More countries are coming soon.
        </Text>
      </View>
    </SmartBottomSheet>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    selected: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.primary,
      fontWeight: '600',
    },
    note: {
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.md,
    },
    noteText: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.textMuted,
    },
  });
