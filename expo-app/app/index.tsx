// ============================================
// SMART RIDE MOBILE - WELCOME / LANDING SCREEN
// ============================================
// Premium branded entry (matches the "Your City, Your Way" mockup).
// Official logo + PREMIUM SERVICE badge + headline + Get Started / Log In.
// Returning users are routed straight to their role home.
//
// The hero is the Kampala golden-hour photo from the design mockup, anchored
// to the top of the screen and faded into the brand green that the headline
// and CTAs sit on.
//
// Why it is not full-bleed: the source frame is 1408x768 landscape. Stretching
// it over the whole screen means cropping to the handset aspect (~0.47), which
// can only ever show 768*0.47 ~= 364px of the 1408 width — about a quarter of
// the scene — no matter which crop is used. That reads as a heavy zoom into
// the rider and throws away the skyline the shot exists for. Rendering it at
// its own aspect across the top shows ~43% of the frame instead, keeping the
// skyline, the road and the rider together.
// ============================================

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store';
import { navigateToRoleHome } from '../src/utils/roleRouting';
import SmartRideLogoImage from '../assets/images/smartride-logo.png';

// Hero photo (Kampala skyline at golden hour + Smart Ride boda rider).
const HERO_IMAGE: number | null = require('../assets/images/welcome-hero.jpg');

// Intrinsic size of the bundled asset — used to render it at its own aspect.
const HERO_W = 1080;
const HERO_H = 1368;

// The hero needs explicit pixel dimensions, not just absoluteFill's insets.
// Release builds shrink resources into a bare res/ with no density qualifier,
// so Android decodes the JPEG as mdpi and upscales it by the device density —
// and <Image> then lays out at that inflated intrinsic size instead of the
// inset-derived one (a plain View like the gradient fills correctly, which is
// why only the photo was affected). Pinning it to an explicit box makes the
// density irrelevant.
const SCREEN = Dimensions.get('screen');
const HERO_HEIGHT = Math.round(SCREEN.width * (HERO_H / HERO_W));
// Where the photo ends, as a fraction of screen height — the gradient must
// reach solid brand green exactly here so there is no visible seam.
const HERO_FRACTION = Math.min(HERO_HEIGHT / SCREEN.height, 0.72);

function FadeSlideIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 650, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 650, delay, useNativeDriver: true }),
    ]).start();
  }, [delay]);
  return <Animated.View style={[{ transform: [{ translateY }], opacity }, style]}>{children}</Animated.View>;
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#062018" />

      {/* Hero background: photo if provided, else premium deep-green gradient */}
      {HERO_IMAGE ? (
        <>
          <Image
            source={HERO_IMAGE}
            style={{ position: 'absolute', top: 0, left: 0, width: SCREEN.width, height: HERO_HEIGHT }}
            resizeMode="cover"
          />
          {/*
            Scrim shaped around the photo rather than a flat wash: a light top
            scrim keeps the logo legible against the bright golden sky, it
            clears through the middle so the skyline and rider actually read,
            then ramps to solid brand green by the photo's bottom edge so the
            photo dissolves into the background instead of ending on a hard
            line, and the headline/CTAs sit on flat colour. Brand green
            (#062018) is used instead of the mockup's navy to match the app.
          */}
          <LinearGradient
            colors={[
              'rgba(6,32,24,0.55)',
              'rgba(6,32,24,0.05)',
              'rgba(6,32,24,0.35)',
              '#062018',
              '#062018',
            ]}
            locations={[0, 0.16, HERO_FRACTION * 0.66, HERO_FRACTION, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <LinearGradient
          colors={['#0e5637', '#0a3d29', '#062018']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        {/* ─── Top: logo ─── */}
        <FadeSlideIn delay={80}>
          <View style={styles.topRow}>
            <View style={styles.logoBadge}>
              <Image source={SmartRideLogoImage} style={styles.logoImage} resizeMode="contain" />
            </View>
          </View>
        </FadeSlideIn>

        <View style={styles.spacer} />

        {/* ─── Headline + tagline ─── */}
        <FadeSlideIn delay={220}>
          <Text style={styles.headline}>Your City,{'\n'}Your Way</Text>
        </FadeSlideIn>
        <FadeSlideIn delay={340}>
          <Text style={styles.tagline}>
            The fastest way to get around, order food, and send parcels with professional reliability and modern elegance.
          </Text>
        </FadeSlideIn>

        {/* ─── CTAs ─── */}
        <FadeSlideIn delay={460} style={styles.ctaWrap}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/auth/register')} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/auth/login')} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>Log In</Text>
          </TouchableOpacity>
        </FadeSlideIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#062018' },
  content: { flex: 1, paddingHorizontal: 24 },

  topRow: { flexDirection: 'row', alignItems: 'center' },
  logoBadge: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoImage: { width: 48, height: 48, borderRadius: 12 },

  spacer: { flex: 1 },

  headline: {
    fontSize: 46, lineHeight: 50, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -0.5, marginBottom: 16,
  },
  tagline: {
    fontSize: 16, lineHeight: 24, color: 'rgba(255,255,255,0.82)',
    marginBottom: 28,
  },

  ctaWrap: { gap: 12 },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 58, borderRadius: 16, backgroundColor: '#00a15a',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  secondaryButton: {
    height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
});
