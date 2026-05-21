// ============================================
// SMART RIDE MOBILE - SPLASH SCREEN
// ============================================
// Premium splash screen with animated logo
// ============================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#00FF88',
  accent: '#00FFF3',
  background: '#0D0D12',
  text: '#FFFFFF',
};

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Parallel animations
    Animated.parallel([
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      // Scale up
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      // Slide up for text
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
      // Glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.container}>
      {/* Background glow */}
      <Animated.View 
        style={[
          styles.backgroundGlow, 
          { opacity: glowOpacity }
        ]} 
      />

      {/* Logo */}
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/images/smartride-logo.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
      </Animated.View>

      {/* App Name */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text style={styles.appName}>
          <Text style={styles.appNameLight}>Smart </Text>
          <Text style={styles.appNameAccent}>Ride</Text>
        </Text>
        <Text style={styles.tagline}>Your ride, your way</Text>
      </Animated.View>

      {/* Decorative corners */}
      <View style={styles.topLeftCorner} />
      <View style={styles.bottomRightCorner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundGlow: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: COLORS.primary,
    opacity: 0.1,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  appNameLight: {
    color: COLORS.text,
  },
  appNameAccent: {
    color: COLORS.primary,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 8,
  },
  topLeftCorner: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 60,
    height: 60,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    borderTopLeftRadius: 16,
  },
  bottomRightCorner: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 60,
    height: 60,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(0, 255, 243, 0.3)',
    borderBottomRightRadius: 16,
  },
});
