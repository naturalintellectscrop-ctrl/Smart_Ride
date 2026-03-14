/**
 * Smart Ride - React Native App Entry Point
 * 
 * This is the future native mobile app for Smart Ride.
 * Architecture: React Native + TypeScript + Zustand
 * 
 * MIGRATION GUIDE:
 * 1. Set up React Native environment: https://reactnative.dev/docs/environment-setup
 * 2. Copy this folder to a new project
 * 3. Run: npm install
 * 4. For iOS: cd ios && pod install
 * 5. Run: npm run android or npm run ios
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Screens (to be implemented)
import { HomeScreen } from './src/screens/HomeScreen';
import { RideScreen } from './src/screens/RideScreen';
import { FoodScreen } from './src/screens/FoodScreen';
import { ShoppingScreen } from './src/screens/ShoppingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';

// Navigation types
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: '#1F4E79',
        tabBarInactiveTintColor: '#9CA3AF',
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tab.Screen 
        name="Ride" 
        component={RideScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon name="car" color={color} />,
        }}
      />
      <Tab.Screen 
        name="Food" 
        component={FoodScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon name="food" color={color} />,
        }}
      />
      <Tab.Screen 
        name="Shopping" 
        component={ShoppingScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon name="cart" color={color} />,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Placeholder Tab Icon component
function TabIcon({ name, color }: { name: string; color: string }) {
  // TODO: Implement with react-native-vector-icons
  return null;
}

// Main App Component
export default function App() {
  const isAuthenticated = false; // TODO: Connect to auth store

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#1F4E79" />
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
