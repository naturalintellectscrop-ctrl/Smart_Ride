// ============================================
// SMART RIDE MOBILE - ROOT LAYOUT
// ============================================
import 'react-native-reanimated';

import React, { Component, ReactNode, useEffect } from 'react';
import { View, Text, StyleSheet, LogBox } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '../src/context/theme-context';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Cannot update a component from inside the test renderer',
  'expo-notifications',
  'RNGoogleSignin',
]);

class ProviderErrorBoundary extends Component<
  { children: ReactNode; name: string },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined as Error | undefined };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{this.state.error?.message || 'Unknown error in ' + this.props.name}</Text>
          <Text style={styles.errorHint}>Please restart the app</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60000, gcTime: 300000 } },
});

function initServicesInBackground() {
  try { const g = require('../src/config/google'); if (g?.configureGoogleSignIn) g.configureGoogleSignIn(); } catch (e: any) { console.warn('[App] Google Sign-In not available:', e?.message || e); }
  (async () => { try { const { notificationService } = require('../src/services'); if (notificationService?.initialize) await notificationService.initialize(); } catch (e: any) { console.log('[App] Notifications skipped:', e?.message || e); } })();
  try { const { notificationService } = require('../src/services'); if (notificationService?.setupListeners) { notificationService.setupListeners((n: any) => console.log('[App] Notification:', n.title), (r: any) => { try { const d = r.notification.request.content.data as any; if (d?.entityType === 'task' || d?.type?.includes('RIDE')) router.push('/(tabs)/rides'); else if (d?.entityType === 'order' || d?.type?.includes('ORDER')) router.push('/(tabs)/orders'); } catch {} }); } } catch (e: any) { console.log('[App] Notification listeners skipped:', e?.message || e); }
}

function ThemedRootLayout() {
  const { isDark, colors } = useTheme();
  useEffect(() => { initServicesInBackground(); }, []);
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <ProviderErrorBoundary name="Navigation">
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" /><Stack.Screen name="auth/login" /><Stack.Screen name="auth/register" /><Stack.Screen name="auth/phone-login" /><Stack.Screen name="auth/verify-otp" /><Stack.Screen name="auth/forgot-password" /><Stack.Screen name="auth/reset-password" /><Stack.Screen name="(tabs)" /><Stack.Screen name="delivery/index" /><Stack.Screen name="rider/ride-request" /><Stack.Screen name="rider/ride-tracking" /><Stack.Screen name="driver/index" /><Stack.Screen name="driver/driver-task" /><Stack.Screen name="wallet/index" /><Stack.Screen name="health/index" /><Stack.Screen name="shopping/index" /><Stack.Screen name="profile/edit" /><Stack.Screen name="orders/restaurants" /><Stack.Screen name="orders/order-tracking" /><Stack.Screen name="health/pharmacy/[id]" /><Stack.Screen name="health/prescriptions" /><Stack.Screen name="notifications/index" />
        </Stack>
      </ProviderErrorBoundary>
    </>
  );
}

export default function RootLayout() {
  return (
    <ProviderErrorBoundary name="Root">
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <ThemedRootLayout />
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ProviderErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D0D12', padding: 20 },
  errorTitle: { color: '#FF6B35', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  errorText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  errorHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});
