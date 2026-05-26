// ============================================
// SMART RIDE MOBILE - ROOT LAYOUT
// ============================================
// Expo Router Entry Point - MINIMAL VERSION
// This is the REAL runtime root in release builds
// Entry: expo-router/entry → app/_layout.tsx
// ============================================

// CRITICAL: Reanimated must be first import
import 'react-native-reanimated';

// NativeWind global styles
import './global.css';

import React, { Component, ReactNode, useEffect } from 'react';
import { View, Text, StyleSheet, LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureGoogleSignIn } from '../src/config/google';

// Suppress known benign warnings in production
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Cannot update a component from inside the test renderer',
]);

// ============================================
// BRAND COLORS - Smart Ride Uganda
// ============================================
const COLORS = {
  primaryGreen: '#00FF88',    // Neon Green - Main brand color
  accent: '#00FFF3',          // Cyan - Secondary accent
  darkSurface: '#0D0D12',     // Dark background
  surface: '#1A1A24',         // Card surface
  white: '#FFFFFF',
  warning: '#FFB800',
  error: '#FF4757',
};

// ============================================
// ERROR BOUNDARY - Prevents provider crashes
// ============================================
class ProviderErrorBoundary extends Component<
  { children: ReactNode; name: string },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined as Error | undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'Unknown error in ' + this.props.name}
          </Text>
          <Text style={styles.errorHint}>Please restart the app</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ============================================
// SAFE QUERY CLIENT - With error handling
// ============================================
const createQueryClient = () => {
  try {
    return new QueryClient({
      defaultOptions: {
        queries: { 
          retry: 1, 
          staleTime: 60000,
          gcTime: 300000,
        },
      },
    });
  } catch (error) {
    console.warn('[QueryClient] Failed to create, using fallback');
    return new QueryClient();
  }
};

const queryClient = createQueryClient();

// ============================================
// ROOT LAYOUT - With Error Boundaries
// ============================================
export default function RootLayout() {
  // Configure Google Sign-In once on app startup
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  return (
    <ProviderErrorBoundary name="Root">
      <QueryClientProvider client={queryClient}>
        <ProviderErrorBoundary name="GestureHandler">
          <GestureHandlerRootView style={styles.container}>
            <ProviderErrorBoundary name="SafeArea">
              <SafeAreaProvider>
                <StatusBar style="light" backgroundColor={COLORS.darkSurface} />
                <ProviderErrorBoundary name="Navigation">
                  <Stack 
                    screenOptions={{ 
                      headerShown: false,
                      contentStyle: { backgroundColor: COLORS.darkSurface }
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="auth/login" />
                    <Stack.Screen name="auth/register" />
                    <Stack.Screen name="auth/phone-login" />
                    <Stack.Screen name="auth/verify-otp" />
                    <Stack.Screen name="auth/forgot-password" />
                    <Stack.Screen name="auth/reset-password" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="delivery/index" />
                    <Stack.Screen name="rider/ride-request" />
                    <Stack.Screen name="rider/ride-tracking" />
                    <Stack.Screen name="driver/index" />
                    <Stack.Screen name="driver/driver-task" />
                    <Stack.Screen name="wallet/index" />
                    <Stack.Screen name="health/index" />
                    <Stack.Screen name="shopping/index" />
                    <Stack.Screen name="profile/edit" />
                    <Stack.Screen name="orders/restaurants" />
                    <Stack.Screen name="orders/order-tracking" />
                  </Stack>
                </ProviderErrorBoundary>
              </SafeAreaProvider>
            </ProviderErrorBoundary>
          </GestureHandlerRootView>
        </ProviderErrorBoundary>
      </QueryClientProvider>
    </ProviderErrorBoundary>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.darkSurface,
    padding: 20,
  },
  errorTitle: {
    color: '#FF6B35',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
});
