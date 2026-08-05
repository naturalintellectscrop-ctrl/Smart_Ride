// ============================================
// SMART RIDE MOBILE - TABS LAYOUT
// ============================================
// Theme-aware with Smart Ride Branding
// ============================================

import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/theme-context';
import { useAuthStore } from '@/src/store';

export default function TabsLayout() {
  const { isAuthenticated } = useAuthStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.text,
        },
        tabBarStyle: {
          backgroundColor: colors.backgroundElevated,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 8,
          // Add bottom safe-area inset so the tab bar isn't cut off by
          // the iPhone home indicator or Android gesture nav bar.
          paddingBottom: 8 + insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          // Home screen renders its own AppHeader inside a ScrollView,
          // so we MUST hide the default navigation header here — otherwise
          // the user sees two headers stacked (nav header + AppHeader).
          headerShown: false,
          title: 'Smart Ride',
          tabBarIcon: ({ focused, color, size }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons name="home" size={size} color={color} />
            </AnimatedTabIcon>
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: 'My Rides',
          tabBarIcon: ({ focused, color, size }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons name="car" size={size} color={color} />
            </AnimatedTabIcon>
          ),
          tabBarLabel: 'Rides',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused, color, size }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons name="bag-handle" size={size} color={color} />
            </AnimatedTabIcon>
          ),
          tabBarLabel: 'Orders',
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          href: null, // hidden from tab bar — accessible via ride/order chat buttons
          tabBarIcon: ({ focused, color, size }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons name="chatbubble" size={size} color={color} />
            </AnimatedTabIcon>
          ),
          tabBarLabel: 'Messages',
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ focused, color, size }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={size} color={color} />
            </AnimatedTabIcon>
          ),
          tabBarLabel: 'Wallet',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons name="person" size={size} color={color} />
            </AnimatedTabIcon>
          ),
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}

// Animated Tab Icon wrapper with scale and bounce effect
function AnimatedTabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
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
      {children}
    </Animated.View>
  );
}
