// ============================================
// SMART RIDE MOBILE - OTP BOXES
// ============================================
// The six-digit code entry, restyled to the auth card family.
//
// This is a PURELY PRESENTATIONAL component. Every behaviour — paste spread
// across boxes, auto-advance, backspace back-focus, auto-submit on the sixth
// digit, the shake, the expiry — stays in verify-otp.tsx, which owns the
// state and the refs. Moving that logic in here would risk the pieces that
// are genuinely fiddly (maxLength on box 0 is OTP_LENGTH so a pasted code
// lands in one field, and `textContentType="oneTimeCode"` only autofills the
// first box) for no gain.
//
// Unlike FieldCard, these boxes DO show focus. A single-character box has no
// caret to speak of, so without a focus ring there is nothing to say which
// digit is next, and the cursor-jump problem does not apply to a field that
// holds one character.
// ============================================

import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { SPACING, RADIUS, BORDER, TYPOGRAPHY } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

export const OTP_LENGTH = 6;

interface OtpBoxesProps {
  value: string[];
  onChangeDigit: (text: string, index: number) => void;
  onKeyPress: (key: string, index: number) => void;
  onFocusIndex: (index: number) => void;
  focusedIndex: number;
  inputRefs: React.MutableRefObject<(TextInput | null)[]>;
  error?: boolean;
  editable?: boolean;
  autoFocusFirst?: boolean;
  length?: number;
  style?: ViewStyle;
}

export function OtpBoxes({
  value,
  onChangeDigit,
  onKeyPress,
  onFocusIndex,
  focusedIndex,
  inputRefs,
  error = false,
  editable = true,
  autoFocusFirst = true,
  length = OTP_LENGTH,
  style,
}: OtpBoxesProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.row, style]}>
      {value.map((digit, index) => {
        const isFocused = focusedIndex === index;
        return (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={[
              styles.box,
              isFocused && styles.boxFocused,
              digit.length === 1 && styles.boxFilled,
              error && styles.boxError,
            ]}
            value={digit}
            onChangeText={(text) => onChangeDigit(text, index)}
            onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key, index)}
            onFocus={() => onFocusIndex(index)}
            keyboardType="number-pad"
            // Box 0 accepts the whole code so a pasted or autofilled OTP lands
            // in one field and is then spread by the parent.
            maxLength={index === 0 ? length : 1}
            selectTextOnFocus
            editable={editable}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus={autoFocusFirst && index === 0}
            maxFontSizeMultiplier={1}
            placeholder="•"
            placeholderTextColor={COLORS.outlineVariant}
            accessibilityLabel={`Digit ${index + 1} of ${length}`}
          />
        );
      })}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },
    box: {
      flex: 1,
      height: 64,
      borderRadius: RADIUS.lg,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.border,
      backgroundColor: COLORS.authCard,
      textAlign: 'center',
      ...TYPOGRAPHY.headlineLg,
      color: COLORS.onSurface,
      padding: 0,
    },
    boxFocused: {
      borderColor: COLORS.primary,
      borderWidth: BORDER.emphasis,
      backgroundColor: COLORS.authGutter,
    },
    boxFilled: {
      borderColor: COLORS.primary,
    },
    boxError: {
      borderColor: COLORS.error,
    },
  });
