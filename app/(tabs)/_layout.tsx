/* eslint-disable react-hooks/immutability */
// ============================================
// SMART RIDE MOBILE - TABS LAYOUT
// ============================================

import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '@/src/constants';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.white,
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Smart Ride',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon icon="🏠" focused={focused} />
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: 'My Rides',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon icon="🚗" focused={focused} />
          ),
          tabBarLabel: 'Rides',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon icon="📦" focused={focused} />
          ),
          tabBarLabel: 'Orders',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon icon="👤" focused={focused} />
          ),
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}

// Animated Tab Icon with scale and bounce effect
function AnimatedTabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.2, { damping: 12, stiffness: 200 });
      translateY.value = withSpring(-4, { damping: 15, stiffness: 200 });
    } else {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
    }
  }, [focused, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
    </Animated.View>
  );
}
