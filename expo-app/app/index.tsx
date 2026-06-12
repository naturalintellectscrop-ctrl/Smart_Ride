// ============================================
// SMART RIDE MOBILE - SPLASH SCREEN
// ============================================
// Premium branded launch screen
// Clean, modern, production-ready
// PRIMARY CTA: Phone OTP (most popular in Uganda)
// SECONDARY CTA: Email/Password login
// ============================================

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants';

// ============================================
// LOGO COMPONENT - Location Pin Icon
// ============================================
function SmartRideLogo() {
  return (
    <View style={styles.logoWrapper}>
      {/* Outer glow ring */}
      <View style={styles.logoGlowRing} />
      
      {/* Main logo badge */}
      <View style={styles.logoBadge}>
        {/* Location pin icon */}
        <View style={styles.pinContainer}>
          {/* Pin head */}
          <View style={styles.pinHead}>
            <View style={styles.pinInner} />
          </View>
          {/* Pin body */}
          <View style={styles.pinBody} />
        </View>
        
        {/* Motion trail lines */}
        <View style={styles.motionTrail}>
          <View style={[styles.motionLine, styles.motionLine1]} />
          <View style={[styles.motionLine, styles.motionLine2]} />
        </View>
      </View>
    </View>
  );
}

// ============================================
// MAIN SPLASH SCREEN
// ============================================
export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Main content - centered */}
      <View style={styles.centerContent}>
        {/* Logo */}
        <SmartRideLogo />
        
        {/* Brand name */}
        <Text style={styles.brandName}>Smart Ride</Text>
        
        {/* Tagline */}
        <Text style={styles.tagline}>Move smarter across Uganda</Text>
      </View>

      {/* Bottom section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}>
        {/* Action buttons */}
        <View style={styles.buttonContainer}>
          {/* PRIMARY: Phone OTP Sign In */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/auth/phone-login')}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={22} color={COLORS.background} style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>Get Started with Phone</Text>
          </TouchableOpacity>

          {/* SECONDARY: Email Sign In */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.85}
          >
            <Ionicons name="mail" size={20} color={COLORS.white} style={styles.buttonIcon} />
            <Text style={styles.secondaryButtonText}>Sign In with Email</Text>
          </TouchableOpacity>

          {/* Create Account link */}
          <TouchableOpacity
            onPress={() => router.push('/auth/register')}
            activeOpacity={0.7}
          >
            <Text style={styles.createAccountText}>
              Don't have an account? <Text style={styles.createAccountLink}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Version */}
        <Text style={styles.versionText}>v1.0.0</Text>
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const BADGE_SIZE = 140;
const PIN_HEAD_SIZE = 48;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  
  logoGlowRing: {
    position: 'absolute',
    width: BADGE_SIZE + 30,
    height: BADGE_SIZE + 30,
    borderRadius: (BADGE_SIZE + 30) / 2,
    backgroundColor: COLORS.white,
    opacity: 0.15,
  },
  
  logoBadge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  
  pinContainer: {
    alignItems: 'center',
    marginTop: -8,
  },
  
  pinHead: {
    width: PIN_HEAD_SIZE,
    height: PIN_HEAD_SIZE,
    borderRadius: PIN_HEAD_SIZE / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  
  pinInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.white,
  },
  
  pinBody: {
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderTopWidth: 28,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.primary,
    marginTop: -6,
  },
  
  motionTrail: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -10,
  },
  motionLine: {
    position: 'absolute',
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.white,
  },
  motionLine1: {
    width: 16,
    top: 0,
    opacity: 0.6,
  },
  motionLine2: {
    width: 10,
    top: 10,
    opacity: 0.35,
  },
  
  brandName: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.white,
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  
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

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 14,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.white,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '600',
  },

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
  
  versionText: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.5,
    fontWeight: '500',
    marginTop: 8,
  },
});
