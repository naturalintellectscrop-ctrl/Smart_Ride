// ============================================
// SMART RIDE MOBILE - BRAND LOCKUP
// ============================================
// Logo tile + wordmark + tagline. Five hand-rolled variations of this existed
// across the auth screens; this is the one.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { TYPOGRAPHY, SPACING, AUTH } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

const SmartRideLogo = require('../../../assets/images/brand-mark.png');

interface BrandLockupProps {
  /** Hide the tagline where vertical space is tight (OTP, change password). */
  showTagline?: boolean;
  style?: ViewStyle;
}

export function BrandLockup({ showTagline = true, style }: BrandLockupProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.row, style]} accessible accessibilityLabel="Smart Ride">
      <Image source={SmartRideLogo} style={styles.tile} resizeMode="cover" />
      <View style={styles.text}>
        <Text style={styles.wordmark}>Smart Ride</Text>
        {showTagline ? <Text style={styles.tagline}>Drive. Deliver. Earn.</Text> : null}
      </View>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.gutter,
    },
    tile: {
      width: AUTH.logoTile,
      height: AUTH.logoTile,
      borderRadius: AUTH.logoTileRadius,
    },
    text: {
      flexShrink: 1,
    },
    wordmark: {
      ...TYPOGRAPHY.headlineLg,
      color: COLORS.primary,
    },
    tagline: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
    },
  });
