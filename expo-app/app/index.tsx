// ============================================
// SMART RIDE MOBILE - SPLASH SCREEN
// ============================================
// Stitch Design System — Material Design 3 Green Theme
// Premium branded launch screen with atmospheric effects
// PRIMARY CTA: Continue with Phone (with phone icon)
// SECONDARY CTA: Sign In with Email (with mail icon)
// ============================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS } from '../src/constants';
import { useAuthStore } from '../src/store';
import { navigateToRoleHome } from '../src/utils/roleRouting';
import SmartRideLogoImage from '../assets/images/smartride-logo.png';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// ANIMATED WRAPPER — slide-up entrance
// ============================================
function SlideUpView({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 700,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={[{ transform: [{ translateY }], opacity }, style]}>
      {children}
    </Animated.View>
  );
}

// ============================================
// LOGO COMPONENT — Stitch Design System
// 128×128, white/5% overlay bg, rounded-xl, shadow-2xl
// ============================================
function SmartRideLogo() {
  // Pulse-soft animation for glow
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1.15,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.08,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.15,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.logoWrapper}>
      {/* Logo glow — secondaryContainer/10 blur-3xl equivalent */}
      <Animated.View
        style={[
          styles.logoGlow,
          {
            transform: [{ scale: glowScale }],
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Main logo badge — 128×128, rounded-xl, white/5% bg */}
      <View style={styles.logoBadge}>
        <Image
          source={SmartRideLogoImage}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

// ============================================
// ATMOSPHERIC BLUR BLOBS
// secondary-container at top-left, primary at bottom-right
// ============================================
function AtmosphericBlobs() {
  return (
    <>
      {/* Top-left blob — secondaryContainer */}
      <View style={styles.blobTopLeft} />
      {/* Bottom-right blob — primary */}
      <View style={styles.blobBottomRight} />
    </>
  );
}

// ============================================
// MAIN SPLASH SCREEN
// ============================================
export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuthStore();

  // Returning users go straight to their role home — no tapping required.
  // The root layout rehydrates the SecureStore token async, so on a cold
  // start isAuthenticated flips true a moment after mount; this effect fires
  // then and replaces the splash. Signed-out users just see the CTAs.
  useEffect(() => {
    if (isAuthenticated) {
      navigateToRoleHome(user?.role);
    }
  }, [isAuthenticated, user?.role]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryContainer} />

      {/* Atmospheric blur blobs */}
      <AtmosphericBlobs />

      {/* Main content — centered vertically */}
      <View style={styles.centerContent}>
        {/* Logo with glow */}
        <SlideUpView delay={100}>
          <SmartRideLogo />
        </SlideUpView>

        {/* "Smart Ride" title — white, 22px bold */}
        <SlideUpView delay={200}>
          <Text style={styles.brandName}>Smart Ride</Text>
        </SlideUpView>

        {/* Subtitle "Uganda's Premium Choice" — white/80%, label-md, tracking-widest uppercase */}
        <SlideUpView delay={300}>
          <Text style={styles.subtitle}>UGANDA'S PREMIUM CHOICE</Text>
        </SlideUpView>

        {/* Loading spinner — 24×24, white border ring */}
        <SlideUpView delay={400}>
          <View style={styles.spinnerContainer}>
            <View style={styles.spinner} />
          </View>
        </SlideUpView>

        {/* Sub-brand "Les Transporteurs" — white, headline-md */}
        <SlideUpView delay={450}>
          <Text style={styles.subBrand}>Les Transporteurs</Text>
        </SlideUpView>

        {/* Tagline "Reliable • Smart • Secure" — white/60%, label-md */}
        <SlideUpView delay={500}>
          <Text style={styles.tagline}>Reliable • Smart • Secure</Text>
        </SlideUpView>
      </View>

      {/* Bottom section — buttons and version */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}>
        <SlideUpView delay={600} style={styles.buttonContainer}>
          {/* PRIMARY BUTTON: Continue with Phone */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/auth/phone-login')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="phone-portrait"
              size={22}
              color={COLORS.onPrimary}
              style={styles.buttonIcon}
            />
            <Text style={styles.primaryButtonText}>Continue with Phone</Text>
          </TouchableOpacity>

          {/* SECONDARY BUTTON: Sign In with Email */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="mail"
              size={20}
              color={COLORS.white}
              style={styles.buttonIcon}
            />
            <Text style={styles.secondaryButtonText}>Sign In with Email</Text>
          </TouchableOpacity>

          {/* Create Account link */}
          <TouchableOpacity
            onPress={() => router.push('/auth/register')}
            activeOpacity={0.7}
          >
            <Text style={styles.createAccountText}>
              Don't have an account?{' '}
              <Text style={styles.createAccountLink}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </SlideUpView>

        {/* Version — white/40%, label-md */}
        <SlideUpView delay={700}>
          <Text style={styles.versionText}>v1.0.0</Text>
        </SlideUpView>
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const LOGO_SIZE = 128;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryContainer, // #0e7a4d — deep green
  },

  // ── Atmospheric Blur Blobs ──
  blobTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.secondaryContainer, // #6bff8f
    opacity: 0.1,
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.primary, // #005f3a
    opacity: 0.15,
  },

  // ── Center Content ──
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // ── Logo ──
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoGlow: {
    position: 'absolute',
    width: LOGO_SIZE + 48,
    height: LOGO_SIZE + 48,
    borderRadius: (LOGO_SIZE + 48) / 2,
    backgroundColor: COLORS.secondaryContainer, // glow = secondaryContainer/10
  },
  logoBadge: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: RADIUS.xl, // 24 — rounded-xl
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    // shadow-2xl equivalent
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoImage: {
    width: LOGO_SIZE - 16,
    height: LOGO_SIZE - 16,
    borderRadius: RADIUS.lg,
  },

  // ── Brand Name — "Smart Ride" white, 22px bold ──
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 6,
    // Plus Jakarta Sans → system default bold in RN
  },

  // ── Subtitle — "Uganda's Premium Choice" white/80%, label-md, tracking-widest uppercase ──
  subtitle: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.white,
    opacity: 0.8,
    textAlign: 'center',
    letterSpacing: 3, // tracking-widest
    textTransform: 'uppercase',
    marginBottom: 20,
  },

  // ── Spinner — 24×24, white border ring ──
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: COLORS.white,
  },

  // ── Sub-brand — "Les Transporteurs" white, headline-md ──
  subBrand: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 4,
  },

  // ── Tagline — "Reliable • Smart • Secure" white/60%, label-md ──
  tagline: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.white,
    opacity: 0.6,
    textAlign: 'center',
  },

  // ── Bottom Section ──
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },

  // ── Primary Button — bg-primary (#005f3a), text-on-primary (white), h-14, rounded-xl ──
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary, // #005f3a
    paddingVertical: 0,
    height: 56, // h-14
    borderRadius: RADIUS.xl, // 24 — rounded-xl
    marginBottom: 14,
    width: '100%',
    // Button shadow from design system
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: COLORS.onPrimary, // white
    ...TYPOGRAPHY.labelLg, // font-label-lg
  },

  // ── Secondary Button — border-2 border-white, text-white, h-14, rounded-xl ──
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.white,
    height: 56, // h-14
    borderRadius: RADIUS.xl, // 24 — rounded-xl
    width: '100%',
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: COLORS.white,
    ...TYPOGRAPHY.labelLg, // font-label-lg
  },

  // ── Create Account Link ──
  createAccountText: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  createAccountLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // ── Version — white/40%, label-md ──
  versionText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.white,
    opacity: 0.4,
    textAlign: 'center',
  },
});
