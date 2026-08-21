// ============================================
// SMART RIDE MOBILE - LEGAL FOOTNOTE
// ============================================
// The Terms / Privacy line at the bottom of the auth screens. The URLs were
// duplicated (and drifting) across login, register and phone-login.
// ============================================

import React, { useMemo, useCallback } from 'react';
import { Text, StyleSheet, Linking, TextStyle, StyleProp } from 'react-native';
import { TYPOGRAPHY, SPACING } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

export const TERMS_URL = 'https://smartrideug.vercel.app/terms';
export const PRIVACY_URL = 'https://smartrideug.vercel.app/privacy';

interface LegalFootnoteProps {
  /** Leading sentence. Defaults to the sign-up wording. */
  prefix?: string;
  style?: StyleProp<TextStyle>;
}

export function LegalFootnote({
  prefix = 'By creating an account, you agree to our',
  style,
}: LegalFootnoteProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const open = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {
      // A missing browser is not worth interrupting a sign-up for.
    });
  }, []);

  return (
    <Text style={[styles.text, style]}>
      {prefix}{' '}
      <Text
        style={styles.link}
        onPress={() => open(TERMS_URL)}
        accessibilityRole="link"
      >
        Terms of Service
      </Text>
      {' and '}
      <Text
        style={styles.link}
        onPress={() => open(PRIVACY_URL)}
        accessibilityRole="link"
      >
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    text: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: SPACING.md,
    },
    link: {
      color: COLORS.primary,
      fontWeight: '600',
    },
  });
