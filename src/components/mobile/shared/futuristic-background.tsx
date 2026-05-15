// ============================================
// SMART RIDE MOBILE - FUTURISTIC PARTICLE BACKGROUND
// ============================================
// Premium animated background for React Native
// Inspired by: Uber + Linear + fintech apps
// Uses React Native Reanimated for 60fps animations
// ============================================

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// PARTICLE COLORS
// ============================================
const PARTICLE_COLORS = [
  '#00FF88', // Neon green
  '#00FFF3', // Cyan
  '#FF6B35', // Orange
  '#A855F7', // Purple
];

// ============================================
// SINGLE PARTICLE COMPONENT
// ============================================
interface ParticleProps {
  index: number;
  totalParticles: number;
}

function Particle({ index, totalParticles }: ParticleProps) {
  // Random initial position
  const initialX = useMemo(() => Math.random() * SCREEN_WIDTH, []);
  const initialY = useMemo(() => Math.random() * SCREEN_HEIGHT, []);
  
  // Random particle properties
  const size = useMemo(() => Math.random() * 4 + 2, []);
  const color = useMemo(() => PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)], []);
  const delay = useMemo(() => Math.random() * 2000, []);
  const duration = useMemo(() => 8000 + Math.random() * 4000, []);
  
  // Animation values
  const opacity = useSharedValue(0.3 + Math.random() * 0.4);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  
  useEffect(() => {
    // Floating animation
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-30, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
    
    // Horizontal drift
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(20, { duration: duration * 0.7, easing: Easing.inOut(Easing.sin) }),
          withTiming(-20, { duration: duration * 0.7, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
    
    // Breathing scale
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withSpring(1.2, { damping: 2, stiffness: 40 }),
          withSpring(1, { damping: 2, stiffness: 40 })
        ),
        -1,
        true
      )
    );
    
    // Opacity pulse
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 3000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: initialX,
          top: initialY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 8,
          elevation: 4,
        },
        animatedStyle,
      ]}
    />
  );
}

// ============================================
// CONNECTION LINE COMPONENT
// ============================================
interface ConnectionLineProps {
  index: number;
  totalLines: number;
}

function ConnectionLine({ index, totalLines }: ConnectionLineProps) {
  const startX = useMemo(() => Math.random() * SCREEN_WIDTH, []);
  const startY = useMemo(() => Math.random() * SCREEN_HEIGHT, []);
  const endX = useMemo(() => startX + (Math.random() - 0.5) * 200, [startX]);
  const endY = useMemo(() => startY + (Math.random() - 0.5) * 200, [startY]);
  
  const color = useMemo(() => PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)], []);
  const delay = useMemo(() => Math.random() * 3000, []);
  
  const opacity = useSharedValue(0.05);
  const scale = useSharedValue(1);
  
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.15, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.05, { duration: 4000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);
  
  const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View
      style={[
        styles.connectionLine,
        {
          left: startX,
          top: startY,
          width: length,
          height: 1,
          backgroundColor: color,
          transform: [{ rotate: `${angle}deg` }],
          transformOrigin: '0% 50%',
        },
        animatedStyle,
      ]}
    />
  );
}

// ============================================
// GLOW ORB COMPONENT
// ============================================
interface GlowOrbProps {
  color: string;
  size: number;
  x: number;
  y: number;
  delay: number;
}

function GlowOrb({ color, size, x, y, delay }: GlowOrbProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);
  
  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withSpring(1.2, { damping: 2, stiffness: 30 }),
          withSpring(1, { damping: 2, stiffness: 30 })
        ),
        -1,
        true
      )
    );
    
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.5, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 5000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View
      style={[
        styles.glowOrb,
        {
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 40,
          elevation: 10,
        },
        animatedStyle,
      ]}
    />
  );
}

// ============================================
// MAIN PARTICLE BACKGROUND COMPONENT
// ============================================
interface FuturisticParticleBackgroundProps {
  particleCount?: number;
  connectionCount?: number;
  showGlowOrbs?: boolean;
}

export function FuturisticParticleBackground({
  particleCount = 40,
  connectionCount = 15,
  showGlowOrbs = true,
}: FuturisticParticleBackgroundProps) {
  const particles = useMemo(
    () => Array.from({ length: particleCount }, (_, i) => i),
    [particleCount]
  );
  
  const connections = useMemo(
    () => Array.from({ length: connectionCount }, (_, i) => i),
    [connectionCount]
  );
  
  const glowOrbs = useMemo(
    () =>
      showGlowOrbs
        ? [
            { color: 'rgba(0, 255, 136, 0.15)', size: 300, x: SCREEN_WIDTH * 0.3, y: SCREEN_HEIGHT * 0.2, delay: 0 },
            { color: 'rgba(0, 255, 243, 0.12)', size: 250, x: SCREEN_WIDTH * 0.7, y: SCREEN_HEIGHT * 0.7, delay: 1000 },
            { color: 'rgba(168, 85, 247, 0.1)', size: 200, x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.5, delay: 2000 },
          ]
        : [],
    [showGlowOrbs]
  );
  
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Ambient gradient background */}
      <View style={styles.ambientGradient} />
      
      {/* Glow orbs */}
      {glowOrbs.map((orb, index) => (
        <GlowOrb key={`orb-${index}`} {...orb} />
      ))}
      
      {/* Connection lines */}
      {connections.map((index) => (
        <ConnectionLine key={`connection-${index}`} index={index} totalLines={connectionCount} />
      ))}
      
      {/* Particles */}
      {particles.map((index) => (
        <Particle key={`particle-${index}`} index={index} totalParticles={particleCount} />
      ))}
    </View>
  );
}

// ============================================
// GLASSMORPHISM CARD COMPONENT
// ============================================
interface GlassCardProps {
  children: React.ReactNode;
  style?: any;
}

export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

// ============================================
// NEON BUTTON COMPONENT
// ============================================
interface NeonButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}

export function NeonButton({ title, onPress, loading, disabled, style }: NeonButtonProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  return (
    <Animated.View style={animatedStyle}>
      <View
        style={[
          styles.neonButton,
          disabled && styles.neonButtonDisabled,
          style,
        ]}
        onTouchStart={() => {
          scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
        }}
        onTouchEnd={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
          if (!disabled && !loading) onPress();
        }}
      >
        <Animated.Text style={styles.neonButtonText}>
          {loading ? 'Loading...' : title}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  ambientGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0D12',
    // Simulating radial gradients with multiple layers
  },
  particle: {
    position: 'absolute',
  },
  connectionLine: {
    position: 'absolute',
  },
  glowOrb: {
    position: 'absolute',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 8,
  },
  neonButton: {
    backgroundColor: '#00FF88',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 6,
  },
  neonButtonDisabled: {
    opacity: 0.5,
  },
  neonButtonText: {
    color: '#0D0D12',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default FuturisticParticleBackground;
