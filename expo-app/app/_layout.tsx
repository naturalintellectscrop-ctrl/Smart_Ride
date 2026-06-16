// ============================================
// SMART RIDE MOBILE - ROOT LAYOUT
// ============================================
// Expo Router Entry Point - MINIMAL VERSION
// This is the REAL runtime root in release builds
// Entry: expo-router/entry → app/_layout.tsx
// ============================================

// CRITICAL: Reanimated must be first import
import 'react-native-reanimated';

// Initialize Sentry for crash reporting (must be early)
import { initSentry } from '../src/lib/sentry';
initSentry();

// NOTE: global.css (NativeWind) removed - was causing style recalculation
// on every render, contributing to jumpy cursor in TextInput fields.
// All styles use StyleSheet.create() directly instead.

import React, { Component, ReactNode, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, LogBox, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '../src/context/theme-context';
import { useRealtime } from '@/src/hooks/useRealtime';
import { useAuthStore } from '@/src/store/authStore';
import { OfflineBanner } from '@/src/components/OfflineBanner';

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
  const { isAuthenticated, setAccessToken, user } = useAuthStore();

  // Connect to Supabase Realtime when authenticated
  useRealtime();

  // Rehydrate access token from SecureStore on app start.
  // Since accessToken is no longer persisted in AsyncStorage,
  // we need to load it from SecureStore and set it in the store.
  useEffect(() => {
    if (!isAuthenticated && user) {
      (async () => {
        try {
          const { secureStorage } = require('../src/utils/secureStorage');
          const token = await secureStorage.getAccessToken();
          if (token) {
            setAccessToken(token);
            console.log('[App] Access token rehydrated from SecureStore');
          }
        } catch (e) {
          console.warn('[App] Failed to rehydrate token from SecureStore:', e);
        }
      })();
    }
  }, []); // Run once on mount

  // Register push notifications with backend when authenticated
  const registerForPushNotifications = useCallback(async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'cc0d40b0-12ac-4997-876c-5f03c9a9ae61',
      });

      if (token.data) {
        const { api } = require('../src/services/api');
        await api.registerPushToken(token.data, Platform.OS);
        console.log('[PUSH] Token registered with backend');
      }
    } catch (e) {
      console.warn('[PUSH] Failed to register:', e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications();
    }
  }, [isAuthenticated, registerForPushNotifications]);

  // Initialize native services AFTER first render
  // Each is wrapped safely so nothing blocks the app
  useEffect(() => {
    // Google Sign-In config — non-blocking, non-fatal
    try {
      const { configureGoogleSignIn } = require('../src/config/google');
      configureGoogleSignIn();
      console.log('[App] Google Sign-In configured');
    } catch (e) {
      console.warn('[App] Google Sign-In config failed (non-fatal):', e);
    }

    // Push notifications — non-blocking, non-fatal
    (async () => {
      try {
        const { notificationService } = require('../src/services');
        const token = await notificationService.initialize();
        if (token) {
          console.log('[App] Push notifications initialized');
        }
      } catch (error) {
        console.log('[App] Push notification init skipped (non-fatal)');
      }
    })();

    // Notification listeners — non-blocking
    try {
      const { notificationService } = require('../src/services');
      notificationService.setupListeners(
        (notification: any) => {
          console.log('[App] Foreground notification:', notification.title);
        },
        (response: any) => {
          try {
            const data = response.notification.request.content.data as any;
            if (data?.entityType === 'task' || data?.type?.includes('RIDE')) {
              router.push('/(tabs)/rides');
            } else if (data?.entityType === 'order' || data?.type?.includes('ORDER')) {
              router.push('/(tabs)/orders');
            }
          } catch {}
        }
      );
    } catch (error) {
      console.log('[App] Notification listeners skipped (non-fatal)');
    }
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <OfflineBanner />
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
          <Stack.Screen name="auth/change-password" />
          <Stack.Screen name="auth/role-selection" />
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
          <Stack.Screen name="profile/saved-addresses" options={{ headerShown: false }} />
          <Stack.Screen name="profile/delete-account" options={{ headerShown: false }} />
          <Stack.Screen name="orders/restaurants" />
          <Stack.Screen name="orders/order-tracking" />
          <Stack.Screen name="health/pharmacy/[id]" />
          <Stack.Screen name="health/prescriptions" />
          <Stack.Screen name="notifications/index" />
          <Stack.Screen name="chat/index" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="call/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="location-picker" options={{ headerShown: false }} />
          <Stack.Screen name="sos/index" options={{ headerShown: false }} />
          <Stack.Screen name="orders/cart" options={{ headerShown: false }} />
          <Stack.Screen name="orders/merchant/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="merchant/index" options={{ headerShown: false }} />
          <Stack.Screen name="merchant/register" options={{ headerShown: false }} />
          <Stack.Screen name="merchant/orders" options={{ headerShown: false }} />
          <Stack.Screen name="merchant/orders/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="merchant/menu" options={{ headerShown: false }} />
          <Stack.Screen name="merchant/earnings" options={{ headerShown: false }} />
          <Stack.Screen name="rider/onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="rider/ride-request" />
          <Stack.Screen name="rider/ride-tracking" />
          <Stack.Screen name="rider/earnings" options={{ headerShown: false }} />
          <Stack.Screen name="rider/wallet" options={{ headerShown: false }} />
          <Stack.Screen name="driver/driver-task" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacist/index" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacist/orders" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacist/orders/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacist/catalog" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacist/prescriptions" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacist/earnings" options={{ headerShown: false }} />
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
    backgroundColor: '#f8f9fa', // Stitch surface
    padding: 20,
  },
  errorTitle: {
    color: '#ba1a1a', // Stitch error
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorText: {
    color: '#191c1d', // Stitch on-surface
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorHint: {
    color: '#6f7a71', // Stitch outline
    fontSize: 12,
  },
});
