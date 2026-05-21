// ============================================
// SMART RIDE MOBILE - TABS LAYOUT
// ============================================
// Premium tab bar with animated vector icons
// Matches admin dashboard design language
// ============================================

import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Icon, IconName } from '../components/Icon';

// Design system colors
const COLORS = {
  primary: '#00FF88',
  primaryDark: '#00CC6A',
  background: '#0D0D12',
  backgroundLight: '#FFFFFF',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.5)',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: COLORS.text,
        },
        headerTintColor: COLORS.primary,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 64,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Smart Ride',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon icon="home" focused={focused} />
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: 'My Rides',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon icon="car" focused={focused} />
          ),
          tabBarLabel: 'Rides',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon icon="package" focused={focused} />
          ),
          tabBarLabel: 'Orders',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon icon="user" focused={focused} />
          ),
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}

// Animated Tab Icon with scale and bounce effect
function AnimatedTabIcon({ icon, focused }: { icon: IconName; focused: boolean }) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.15, { damping: 12, stiffness: 200 });
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
      <Icon 
        name={icon} 
        size="lg" 
        color={focused ? COLORS.primary : COLORS.textMuted} 
      />
    </Animated.View>
  );
}
