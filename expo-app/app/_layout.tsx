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
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureGoogleSignIn } from '../src/config/google';
import { ThemeProvider, useTheme } from '../src/context/theme-context';
import { notificationService } from '../src/services';

// Suppress known benign warnings in production
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Cannot update a component from inside the test renderer',
]);

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
// INNER LAYOUT - Consumes ThemeContext
// ============================================
function ThemedRootLayout() {
  const { isDark, colors } = useTheme();

  // Configure Google Sign-In once on app startup
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  // Initialize push notifications and set up listeners
  useEffect(() => {
    const initNotifications = async () => {
      try {
        const token = await notificationService.initialize();
        if (token) {
          console.log('[App] Push notifications initialized, token:', token.substring(0, 20) + '...');
        }
      } catch (error) {
        console.log('[App] Push notification init failed:', error);
      }
    };

    initNotifications();

    // Set up listeners
    const cleanup = notificationService.setupListeners(
      (notification) => {
        console.log('[App] Foreground notification:', notification.title);
        // Could show an in-app banner/toast here
      },
      (response) => {
        const data = response.notification.request.content.data as any;
        if (data?.entityType === 'task' || data?.type?.includes('RIDE')) {
          router.push('/(tabs)/rides');
        } else if (data?.entityType === 'order' || data?.type?.includes('ORDER')) {
          router.push('/(tabs)/orders');
        } else if (data?.entityType === 'chat' || data?.type?.includes('CHAT')) {
          router.push('/chat');
        }
      }
    );

    return cleanup;
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <ProviderErrorBoundary name="Navigation">
        <Stack 
          screenOptions={{ 
            headerShown: false,
            contentStyle: { backgroundColor: colors.background }
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
          <Stack.Screen name="health/pharmacy/[id]" />
          <Stack.Screen name="health/prescriptions" />
          <Stack.Screen name="notifications/index" />
        </Stack>
      </ProviderErrorBoundary>
    </>
  );
}

// ============================================
// ROOT LAYOUT - With Error Boundaries & Theme
// ============================================
export default function RootLayout() {
  return (
    <ProviderErrorBoundary name="Root">
      <QueryClientProvider client={queryClient}>
        <ProviderErrorBoundary name="GestureHandler">
          <GestureHandlerRootView style={styles.container}>
            <ProviderErrorBoundary name="SafeArea">
              <SafeAreaProvider>
                <ThemeProvider>
                  <ThemedRootLayout />
                </ThemeProvider>
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
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorText: {
    color: '#191c1d',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorHint: {
    color: '#6f7a71',
    fontSize: 12,
  },
});
