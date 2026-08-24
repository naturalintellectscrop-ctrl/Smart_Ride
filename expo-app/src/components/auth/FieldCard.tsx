// ============================================
// SMART RIDE MOBILE - FIELD CARD
// ============================================
// The signature input of the auth / onboarding design language: a bordered
// card with a tinted icon gutter on the left, and a label stacked directly
// over the input inside the card.
//
//   ┌────────┬──────────────────────────────┐
//   │        │  Full Name                   │
//   │  icon  │  Enter your full name    [👁] │
//   ├────────┴──────────────────────────────┤
//   │  optional footer (strength meter …)   │
//   └───────────────────────────────────────┘
//
// ANDROID CURSOR RULE — read before editing:
// This component deliberately has NO focus state and NO focus ring. Border
// width and colour are constant; only `error` changes them. Adding a focus
// style here means a style recalculation on every keystroke-adjacent render,
// which is what makes the Android TextInput caret jump (the same reason
// nativewind was removed in babel.config.js and why IconInput.tsx is written
// the same way). The always-visible label and the green gutter icon carry the
// affordance instead, and the OS caret shows which field is live.
// ============================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS, AUTH, BORDER } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

export interface FieldCardProps extends Omit<TextInputProps, 'style'> {
  /** Sits above the input, inside the card. Always rendered — never a placeholder. */
  label: string;
  /** Ionicon shown in the tinted gutter. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Right-hand adornment, vertically centred against the label + input block. */
  trailing?: React.ReactNode;
  /** Rendered inside the card below the input row, above a hairline. */
  footer?: React.ReactNode;
  /** Sits left of the input on the same row (the phone country chip). */
  inputPrefix?: React.ReactNode;
  /** Error message shown under the card; also recolours the border. */
  error?: string | null;
  style?: ViewStyle;
  inputRef?: React.Ref<TextInput>;
}

function FieldCardComponent({
  label,
  icon,
  trailing,
  footer,
  inputPrefix,
  error,
  style,
  inputRef,
  ...inputProps
}: FieldCardProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={style}>
      <View style={[styles.card, !!error && styles.cardError]}>
        <View style={styles.mainRow}>
          <View style={styles.gutter}>
            <Ionicons name={icon} size={22} color={COLORS.primary} />
          </View>

          <View style={styles.content}>
            <View style={styles.fields}>
              <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {label}
              </Text>
              <View style={styles.inputRow}>
                {inputPrefix}
                <TextInput
                  ref={inputRef}
                  style={[styles.input, inputProps.multiline && styles.inputMultiline]}
                  placeholderTextColor={COLORS.textMuted}
                  accessibilityLabel={label}
                  {...inputProps}
                />
              </View>
            </View>
            {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
          </View>
        </View>

        {footer ? (
          <View style={styles.footer}>
            <View style={styles.footerDivider} />
            {footer}
          </View>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Memoised leaf: the parent re-rendering must not re-run this field's styles. */
export const FieldCard = React.memo(FieldCardComponent);

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: COLORS.authCard,
      borderRadius: RADIUS.lg,
      // Constant width — only the colour reacts to `error`. See the header note.
      borderWidth: BORDER.hairline,
      borderColor: COLORS.border,
      overflow: 'hidden',
    },
    cardError: {
      borderColor: COLORS.error,
    },
    mainRow: {
      flexDirection: 'row',
      minHeight: AUTH.fieldMinHeight,
    },
    gutter: {
      width: AUTH.gutterWidth,
      // Never let a long value or a prefix chip squeeze the icon column.
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.authGutter,
      borderRightWidth: BORDER.hairline,
      borderRightColor: COLORS.authHairline,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.gutter,
    },
    fields: {
      flex: 1,
      minWidth: 0,
    },
    label: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
      marginBottom: 2,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      // A flex child holding a text input needs an explicit zero minimum or it
      // refuses to shrink below its intrinsic content width and pushes the
      // icon gutter and trailing adornment out of the card.
      minWidth: 0,
      ...TYPOGRAPHY.bodyMd,
      color: COLORS.onSurface,
      // Zero out the platform's own padding so the label/input rhythm is ours.
      padding: 0,
      margin: 0,
      minHeight: 24,
    },
    inputMultiline: {
      // Android centres multiline text vertically by default, which leaves a
      // one-line description floating in the middle of a grown field.
      textAlignVertical: 'top',
      minHeight: 60,
    },
    trailing: {
      marginLeft: SPACING.gutter,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.gutter,
    },
    footerDivider: {
      height: BORDER.hairline,
      backgroundColor: COLORS.authHairline,
      marginBottom: SPACING.gutter,
    },
    errorText: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.error,
      marginTop: SPACING.xs + 2,
      marginLeft: SPACING.xs,
    },
  });
