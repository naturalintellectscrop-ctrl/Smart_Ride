// ============================================
// SMART RIDE MOBILE - TABS LAYOUT
// ============================================
// The client tab bar, on the client design surface: a card that sits above the
// page with a hairline top edge, and an active tab marked by a short brand
// underline beneath its label rather than by colour alone.
//
// The underline matters for more than looks. Colour was previously the only
// signal for which tab was active, which is exactly the cue a red-green
// colour-blind reader cannot use; the bar now carries a second, non-colour
// indicator.
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors } from '@/src/theme/themedColors';
import { useAuthStore } from '@/src/store';
import { RADIUS, SPACING, BORDER } from '@/src/constants';

export default function TabsLayout() {
  const { isAuthenticated } = useAuthStore();
  const { colors, isDark } = useTheme();
  const COLORS = React.useMemo(() => makeThemedColors(isDark), [isDark]);
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
          backgroundColor: COLORS.cardSurface,
          borderTopWidth: BORDER.hairline,
          borderTopColor: COLORS.border,
          paddingTop: SPACING.sm,
          // Add bottom safe-area inset so the tab bar isn't cut off by
          // the iPhone home indicator or Android gesture nav bar.
          paddingBottom: SPACING.sm + insets.bottom,
          height: 68 + insets.bottom,
          elevation: 0,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarItemStyle: {
          paddingTop: 2,
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
          tabBarLabel: renderTabLabel('Home'),
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          // Renders its own AppHeader inside the screen — see the note on
          // `index` above. Without this the reader gets two stacked headers.
          headerShown: false,
          title: 'My Rides',
          tabBarIcon: ({ focused, color, size }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons name="car" size={size} color={color} />
            </AnimatedTabIcon>
          ),
          tabBarLabel: renderTabLabel('Rides'),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          headerShown: false,
          title: 'Orders',
          tabBarIcon: ({ focused, color, size }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons name="bag-handle" size={size} color={color} />
            </AnimatedTabIcon>
          ),
          tabBarLabel: renderTabLabel('Orders'),
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
          tabBarLabel: renderTabLabel('Messages'),
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
          tabBarLabel: renderTabLabel('Wallet'),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          title: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons name="person" size={size} color={color} />
            </AnimatedTabIcon>
          ),
          tabBarLabel: renderTabLabel('Profile'),
        }}
      />
    </Tabs>
  );
}

// Animated tab icon: a restrained lift on focus.
//
// The scale was 1.2 with a -4 lift, which pushed the glyph into the label
// underneath it. 1.08 and -2 read as a nudge without collision.
function AnimatedTabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.08, { damping: 14, stiffness: 200 });
      translateY.value = withSpring(-2, { damping: 15, stiffness: 200 });
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

/**
 * Tab label plus the short brand rule that marks the active tab. Returned as a
 * render function because expo-router hands `focused` and `color` to the label,
 * and the underline needs both.
 */
function renderTabLabel(label: string) {
  const TabLabel = ({ focused, color }: { focused: boolean; color: string }) => (
    <View style={tabStyles.labelWrap}>
      <Text style={[tabStyles.label, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      <View
        style={[
          tabStyles.underline,
          { backgroundColor: focused ? color : 'transparent' },
        ]}
      />
    </View>
  );
  TabLabel.displayName = `TabLabel(${label})`;
  return TabLabel;
}

const tabStyles = StyleSheet.create({
  labelWrap: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  underline: {
    // Always laid out, only coloured when focused, so switching tabs never
    // shifts the labels by 6pt.
    width: 18,
    height: 3,
    borderRadius: RADIUS.full,
    marginTop: 3,
  },
});
