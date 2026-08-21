// ============================================
// SMART RIDE MOBILE - WELCOME / LANDING SCREEN
// ============================================
// The entry point into the auth flow, on the shared auth design language so
// the welcome, login and sign-up screens read as one surface rather than a
// dark landing that flips to a light form on the next tap.
//
// This replaces the previous dark photographic hero (#062018 / #00a15a, all
// hardcoded) and with it the explicit-pixel-box workaround that photo needed:
// release builds shrink resources into a bare res/ with no density qualifier,
// so Android decoded the JPEG as mdpi and laid the <Image> out at an inflated
// intrinsic size. The hero plate renders a fixed-height panel with
// resizeMode="contain", so density cannot distort it and the workaround is no
// longer needed.
//
// assets/images/welcome-hero.jpg is now unreferenced. It is left in place
// rather than deleted, since removing a bundled asset is the owner's call.
// ============================================

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store';
import { navigateToRoleHome } from '../src/utils/roleRouting';
import { useTheme } from '../src/context/theme-context';
import { makeThemedColors, ThemedColors } from '../src/theme/themedColors';
import { SPACING, TYPOGRAPHY, ICON } from '../src/constants';
import { GradientButton } from '../src/components';
import { AuthScreen, LegalFootnote } from '../src/components/auth';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = React.useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
  const { isAuthenticated, user } = useAuthStore();

  // Returning users skip the welcome and go straight to their role home.
  //
  // This MUST only run while the welcome screen is actually focused. Expo
  // Router keeps `index` mounted as the Stack root even when other screens
  // (e.g. rider onboarding) are pushed on top, so a plain useEffect keyed on
  // isAuthenticated re-fires whenever the auth store changes — most commonly a
  // token refresh on a slow connection flipping isAuthenticated false→true.
  // That re-fire calls navigateToRoleHome() and yanks a rider out of the
  // middle of onboarding back to the /driver "Complete Your Profile" gate,
  // losing their in-progress form. useFocusEffect scopes the redirect to when
  // the welcome screen is genuinely on top, so it can never hijack another
  // screen's navigation.
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        navigateToRoleHome(user?.role);
      }
    }, [isAuthenticated, user?.role])
  );

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <AuthScreen
        lead="Your city,"
        accent="your way"
        subtitle="Rides, food and parcels across Kampala. One app, always moving."
        showHero
      >
        <View style={styles.spacer} />

        <GradientButton
          title="Get Started"
          onPress={() => router.push('/auth/register')}
          size="lg"
          shape="pill"
          iconPosition="right"
          icon={<Ionicons name="arrow-forward" size={ICON.md} color="#FFFFFF" />}
        />

        <GradientButton
          title="Log In"
          onPress={() => router.push('/auth/login')}
          variant="outline"
          size="lg"
          shape="pill"
        />

        <View style={styles.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
          <Text style={styles.trustText}>Verified riders. Tracked trips. Secure payments.</Text>
        </View>

        <LegalFootnote
          prefix="By continuing, you agree to our"
          style={styles.legal}
        />
      </AuthScreen>
    </>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    // Pushes the CTAs to the bottom of the viewport on tall screens while
    // still letting the whole page scroll on short ones.
    spacer: {
      flexGrow: 1,
      minHeight: SPACING.md,
    },
    trustRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      marginTop: SPACING.sm,
    },
    trustText: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.textMuted,
    },
    legal: {
      marginTop: SPACING.sm,
    },
  });
