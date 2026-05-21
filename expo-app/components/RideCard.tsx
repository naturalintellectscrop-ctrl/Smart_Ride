// ============================================
// SMART RIDE MOBILE - RIDE CARD
// ============================================
// Premium ride option card with gradient and glow
// Matches admin dashboard card styling
// ============================================

import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Icon, IconName } from './Icon';

interface RideCardProps {
  name: string;
  description: string;
  price: string;
  icon: IconName;
  color: string;
  onPress?: () => void;
}

export function RideCard({ name, description, price, icon, color, onPress }: RideCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      friction: 5,
      tension: 300,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 300,
    }).start();
  };

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.container}
      >
        {/* Top accent border */}
        <View style={[styles.topAccent, { backgroundColor: color }]} />
        
        {/* Icon with glow */}
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <View style={[styles.iconGlow, { backgroundColor: color }]} />
          <Icon name={icon} size="xl" color={color} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.description}>{description}</Text>
          <Text style={[styles.price, { color }]}>{price}</Text>
        </View>

        {/* Arrow indicator */}
        <View style={styles.arrowContainer}>
          <Icon name="arrow-right" size="sm" color={color} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    opacity: 0.3,
  },
  content: {
    flex: 1,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginBottom: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrowContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RideCard;
