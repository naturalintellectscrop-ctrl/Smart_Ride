// ============================================
// SMART RIDE MOBILE - WELCOME / LANDING SCREEN
// ============================================
// Premium branded entry (matches the "Your City, Your Way" mockup).
// Official logo + PREMIUM SERVICE badge + headline + Get Started / Log In.
// Returning users are routed straight to their role home.
//
// NOTE: the mockup uses a full-bleed hero photo. Drop a JPG at
// assets/images/welcome-hero.jpg and set HERO_IMAGE to require it; until
// then we render a premium deep-green gradient so nothing looks unfinished.
// ============================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store';
import { navigateToRoleHome } from '../src/utils/roleRouting';
import SmartRideLogoImage from '../assets/images/smartride-logo.png';

// Optional hero photo — set to require('../assets/images/welcome-hero.jpg').
const HERO_IMAGE: number | null = null;

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
  useEffect(() => {
    if (isAuthenticated) {
      navigateToRoleHome(user?.role);
    }
  }, [isAuthenticated, user?.role]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#062018" />

      {/* Hero background: photo if provided, else premium deep-green gradient */}
      {HERO_IMAGE ? (
        <>
          <Image source={HERO_IMAGE} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(6,32,24,0.35)', 'rgba(6,32,24,0.85)', '#062018']}
            locations={[0, 0.55, 1]}
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
        {/* ─── Top: logo + premium badge ─── */}
        <FadeSlideIn delay={80}>
          <View style={styles.topRow}>
            <View style={styles.logoBadge}>
              <Image source={SmartRideLogoImage} style={styles.logoImage} resizeMode="contain" />
            </View>
            <View style={styles.premiumBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#0a3d29" />
              <Text style={styles.premiumText}>PREMIUM SERVICE</Text>
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

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoBadge: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoImage: { width: 48, height: 48, borderRadius: 12 },

  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(152, 246, 190, 0.92)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
  },
  premiumText: { fontSize: 11, fontWeight: '800', color: '#0a3d29', letterSpacing: 1 },

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
