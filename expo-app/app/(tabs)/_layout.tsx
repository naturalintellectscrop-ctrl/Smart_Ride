// ============================================
// SMART RIDE MOBILE - TABS LAYOUT
// ============================================
// Premium dark theme with vector icons
// Matches admin dashboard tab styling
// ============================================

import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Icon, IconName } from '../../components/Icon';
import { COLORS } from '@/src/constants';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: '600',
          color: COLORS.text,
          fontSize: 18,
        },
        tabBarStyle: {
          backgroundColor: COLORS.backgroundElevated,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.05)',
          paddingTop: 8,
          paddingBottom: 8,
          height: 64,
          elevation: 0,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.4)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
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

// Animated Tab Icon with smooth scale effect
function AnimatedTabIcon({ icon, focused }: { icon: IconName; focused: boolean }) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.1, { damping: 15, stiffness: 300 });
      translateY.value = withSpring(-2, { damping: 15, stiffness: 300 });
    } else {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 300 });
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
        color={focused ? COLORS.primary : 'rgba(255, 255, 255, 0.4)'}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
