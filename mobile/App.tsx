/**
 * Smart Ride - React Native App Entry Point
 * 
 * Production mobile app with Mapbox integration.
 * Architecture: React Native + TypeScript + Zustand + Mapbox GL
 * 
 * SETUP:
 * 1. Set up React Native environment: https://reactnative.dev/docs/environment-setup
 * 2. Run: npm install
 * 3. For iOS: cd ios && pod install
 * 4. Run: npm run android or npm run ios
 * 
 * MAPBOX SETUP:
 * 1. Get your Mapbox access token from https://account.mapbox.com/access-tokens/
 * 2. Update the MAPBOX_ACCESS_TOKEN in src/components/MapboxMap.tsx
 * 3. For iOS: Add your token to ios/SmartRide/Info.plist
 * 4. For Android: Add your token to android/app/src/main/AndroidManifest.xml
 */

import React from 'react';
import { StatusBar, View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Screens
import { HomeScreen } from './src/screens/HomeScreen';
import { RideScreen } from './src/screens/RideScreen';
import { FoodScreen } from './src/screens/FoodScreen';
import { ShoppingScreen } from './src/screens/ShoppingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';

// Store
import { useAuthStore } from './src/store';

// Navigation types
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab bar icons with emoji fallback
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '🏠',
    ride: '🚗',
    food: '🍔',
    shopping: '🛒',
    profile: '👤',
  };

  return (
    <View style={styles.tabIconContainer}>
      <Text style={[
        styles.tabIconText,
        focused && styles.tabIconTextActive
      ]}>
        {icons[name] || '•'}
      </Text>
      {focused && <View style={styles.tabIndicator} />}
    </View>
  );
}

// Bottom Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1A24',
          borderTopWidth: 1,
          borderTopColor: '#2D2D3A',
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarActiveTintColor: '#00FF88',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="Ride" 
        component={RideScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="ride" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="Food" 
        component={FoodScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="food" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="Shopping" 
        component={ShoppingScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="shopping" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Component
export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0D0D12" />
        <NavigationContainer>
          <Stack.Navigator 
            screenOptions={{ headerShown: false }}
            initialRouteName={isAuthenticated ? 'Main' : 'Login'}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconText: {
    fontSize: 22,
    opacity: 0.6,
  },
  tabIconTextActive: {
    opacity: 1,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00FF88',
  },
});
