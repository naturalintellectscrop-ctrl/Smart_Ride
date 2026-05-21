// ============================================
// SMART RIDE MOBILE - ANIMATED BACKGROUND
// ============================================
// Premium animated particle background for
// authentication screens
// ============================================

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#00FF88',
  accent: '#00FFF3',
  background: '#0D0D12',
};

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  size: number;
  opacity: Animated.Value;
  duration: number;
}

export function AnimatedBackground() {
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    // Create floating particles
    particles.current = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: new Animated.Value(Math.random() * width),
      y: new Animated.Value(Math.random() * height),
      size: Math.random() * 4 + 2,
      opacity: new Animated.Value(Math.random() * 0.5 + 0.1),
      duration: Math.random() * 3000 + 2000,
    }));

    // Animate each particle
    particles.current.forEach((particle) => {
      const animate = () => {
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(particle.y, {
                toValue: Math.random() * height,
                duration: particle.duration,
                useNativeDriver: true,
              }),
              Animated.timing(particle.x, {
                toValue: Math.random() * width,
                duration: particle.duration * 1.2,
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(particle.opacity, {
                  toValue: Math.random() * 0.5 + 0.2,
                  duration: particle.duration / 2,
                  useNativeDriver: true,
                }),
                Animated.timing(particle.opacity, {
                  toValue: Math.random() * 0.3 + 0.1,
                  duration: particle.duration / 2,
                  useNativeDriver: true,
                }),
              ]),
            ]),
          ])
        ).start();
      };
      animate();
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Gradient overlay */}
      <View style={styles.gradientOverlay} />
      
      {/* Floating particles */}
      {particles.current.map((particle) => (
        <Animated.View
          key={particle.id}
          style={[
            styles.particle,
            {
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              backgroundColor: particle.id % 2 === 0 ? COLORS.primary : COLORS.accent,
              opacity: particle.opacity,
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
              ],
            },
          ]}
        />
      ))}

      {/* Decorative corner elements */}
      <View style={styles.topLeftCorner} />
      <View style={styles.bottomRightCorner} />
      
      {/* Glow effects */}
      <View style={styles.primaryGlow} />
      <View style={styles.accentGlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 18, 0.3)',
  },
  particle: {
    position: 'absolute',
  },
  topLeftCorner: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 80,
    height: 80,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    borderTopLeftRadius: 20,
  },
  bottomRightCorner: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 80,
    height: 80,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(0, 255, 243, 0.3)',
    borderBottomRightRadius: 20,
  },
  primaryGlow: {
    position: 'absolute',
    top: height * 0.2,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
  },
  accentGlow: {
    position: 'absolute',
    bottom: height * 0.2,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 255, 243, 0.08)',
  },
});

export default AnimatedBackground;
