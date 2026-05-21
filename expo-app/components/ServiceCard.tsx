// ============================================
// SMART RIDE MOBILE - SERVICE CARD
// ============================================
// Premium service card with icon and glow effect
// Matches admin dashboard card styling
// ============================================

import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Icon, IconName, IconColors } from './Icon';

interface ServiceCardProps {
  name: string;
  icon: IconName;
  color: string;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function ServiceCard({ name, icon, color, onPress, size = 'md' }: ServiceCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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

  const sizeConfig = {
    sm: { container: 48, icon: 'md' as const, nameSize: 11 },
    md: { container: 56, icon: 'lg' as const, nameSize: 12 },
    lg: { container: 64, icon: 'xl' as const, nameSize: 14 },
  };

  const config = sizeConfig[size];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.wrapper}
      >
        <View style={[styles.container, { width: config.container }]}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: `${color}15`,
                width: config.container,
                height: config.container,
                borderRadius: config.container / 3.5,
              },
            ]}
          >
            <View style={[styles.glow, { backgroundColor: color }]} />
            <Icon name={icon} size={config.icon} color={color} />
          </View>
        </View>
        <Text style={[styles.name, { fontSize: config.nameSize }]}>{name}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: 0.3,
    top: '50%',
    left: '50%',
    marginTop: -10,
    marginLeft: -10,
  },
  name: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ServiceCard;
