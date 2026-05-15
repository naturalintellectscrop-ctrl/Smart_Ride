// ============================================
// SMART RIDE MOBILE - SPLASH SCREEN
// ============================================
// Premium branded launch screen
// Clean, modern, production-ready
// ============================================

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================
// BRAND COLORS - Smart Ride Uganda
// ============================================
const COLORS = {
  primaryGreen: '#00FF88',       // Neon Green - Main brand
  primaryGreenDark: '#00CC6D',
  accent: '#00FFF3',             // Cyan - Secondary
  darkSurface: '#0D0D12',        // Dark background
  accentGold: '#F59E0B',
  white: '#FFFFFF',
  mutedText: '#D1D5DB',
  subtleText: '#9CA3AF',
};

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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryGreen} />
      
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
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/auth/register')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Loading indicator */}
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.white} />
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
    backgroundColor: COLORS.primaryGreen,
  },
  
  // Center content
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Logo wrapper with glow
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  
  // Outer glow ring
  logoGlowRing: {
    position: 'absolute',
    width: BADGE_SIZE + 30,
    height: BADGE_SIZE + 30,
    borderRadius: (BADGE_SIZE + 30) / 2,
    backgroundColor: COLORS.white,
    opacity: 0.15,
  },
  
  // Main badge
  logoBadge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: COLORS.darkSurface,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  
  // Pin container
  pinContainer: {
    alignItems: 'center',
    marginTop: -8,
  },
  
  // Pin head (top circle)
  pinHead: {
    width: PIN_HEAD_SIZE,
    height: PIN_HEAD_SIZE,
    borderRadius: PIN_HEAD_SIZE / 2,
    backgroundColor: COLORS.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  
  // Inner white dot
  pinInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.white,
  },
  
  // Pin body (triangle)
  pinBody: {
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderTopWidth: 28,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.primaryGreen,
    marginTop: -6,
  },
  
  // Motion trail
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
  
  // Brand name
  brandName: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  
  // Tagline
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.white,
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  
  // Bottom section
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  
  // Button container
  buttonContainer: {
    width: '100%',
    maxWidth: 340,
    marginBottom: 24,
  },
  
  // Primary button
  primaryButton: {
    backgroundColor: COLORS.darkSurface,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 14,
    alignItems: 'center',
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
  
  // Secondary button
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.white,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '600',
  },
  
  // Loading row
  loadingRow: {
    marginBottom: 16,
    opacity: 0.7,
  },
  
  // Version text
  versionText: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.5,
    fontWeight: '500',
  },
});
