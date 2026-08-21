// ============================================
// SMART RIDE MOBILE - AUTH HERO ART
// ============================================
// The illustration that opens the auth screens: a Smart Ride car and a
// delivery rider on a mint city skyline.
//
// The plate behind the art is a FIXED light mint in both themes (COLORS
// .authPlate). The artwork is drawn for a light ground — dropping it straight
// onto the dark surface would leave a pale rectangle of skyline floating in
// the dark. Treating it as a plate keeps it reading as a deliberate image
// panel rather than a badly-keyed cutout.
// ============================================

import React, { useMemo } from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { RADIUS, AUTH } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

const HeroArt = require('../../../assets/images/auth-hero.png');

interface AuthHeroArtProps {
  /** Override the plate height where a screen needs a shorter header. */
  height?: number;
  style?: ViewStyle;
}

export function AuthHeroArt({ height = AUTH.heroHeight, style }: AuthHeroArtProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View
      style={[styles.plate, { height }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="A Smart Ride car and a delivery rider on a city street"
    >
      <View style={[styles.glow, { width: height * 1.1, height: height * 1.1 }]} />
      <Image source={HeroArt} style={styles.art} resizeMode="contain" />
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    plate: {
      width: '100%',
      borderRadius: RADIUS.lg,
      backgroundColor: COLORS.authPlate,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    glow: {
      position: 'absolute',
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.authPlateGlow,
    },
    art: {
      width: '100%',
      height: '100%',
    },
  });
