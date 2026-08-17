// ============================================
// SMART RIDE MOBILE - ROOT LAYOUT
// ============================================
// Expo Router Entry Point - MINIMAL VERSION
// This is the REAL runtime root in release builds
// Entry: expo-router/entry → app/_layout.tsx
// ============================================

// CRITICAL: Reanimated must be first import
import 'react-native-reanimated';
import { makeThemedColors } from '@/src/theme/themedColors';

// Initialize Sentry for crash reporting (must be early)
import { initSentry } from '../src/lib/sentry';
initSentry();

// ---------------------------------------------------------------------------
// Set Mapbox access token as early as possible, before ANY map renders.
// The token is a public token (pk.*) baked into the build via constants —
// safe to ship in the APK. This is a belt-and-suspenders call alongside the
// module-scope init in SmartRideMap.tsx, to guarantee the native Mapbox SDK
// has the token before the first MapView mounts (prevents a black map).
// ---------------------------------------------------------------------------
import { Platform } from 'react-native';
import { MAPBOX_CONFIG } from '../src/constants';
try {
  if (Platform.OS !== 'web' && MAPBOX_CONFIG.accessToken) {
    const MapboxGL = require('@rnmapbox/maps').default;
    if (MapboxGL && MAPBOX_CONFIG.accessToken.startsWith('pk.')) {
      MapboxGL.setAccessToken(MAPBOX_CONFIG.accessToken);
      console.log('[App] Mapbox access token set at root layout');
    }
  }
} catch (e) {
  console.warn('[App] Mapbox token init failed (non-fatal):', e);
}

// NOTE: global.css (NativeWind) removed - was causing style recalculation
// on every render, contributing to jumpy cursor in TextInput fields.
// All styles use StyleSheet.create() directly instead.

import React, { Component, ReactNode, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, LogBox } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '../src/context/theme-context';
import { useRealtime } from '@/src/hooks/useRealtime';
import { useIncomingCall } from '@/src/hooks/useIncomingCall';
import { useAuthStore } from '@/src/store/authStore';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { FeedbackHost } from '@/src/components/feedback';
import { configureNotificationChannels, OFFER_ALERT_ID } from '@/src/services/notification-channels';
import { useTaskStore } from '@/src/store/taskStore';

// Without an explicit handler, expo-notifications does not play a sound or
// show an alert while the app is foregrounded — the default behavior in
// current SDKs is to suppress both. This is why the driver's incoming-ride
// request only ever vibrated: nothing was configured to let a foreground
// notification actually make noise. Applies globally, not just to dispatch.
//
// One offer must not produce two alerts. Dispatch deliberately sends a ride
// offer twice — a realtime broadcast (which raises the in-app offer sheet and
// its ringing alert) AND a push (which wakes a backgrounded app that has no
// live channel). Both are needed, but when the app is foregrounded and the
// offer sheet is ALREADY up and ringing for that same offer, the push's tray
// entry and banner are pure duplication on top of the alert the driver is
// already looking at.
//
// So the push is suppressed only on the narrow condition that the offer is
// already being presented in-app. If the sheet is not up — the socket dropped,
// the driver was on another screen, the app was backgrounded — the push shows
// normally. Suppressing it unconditionally would hide the very offer the push
// exists to deliver.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const show = {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };

    try {
      const data = notification.request.content.data as Record<string, unknown> | undefined;
      const type = typeof data?.type === 'string' ? data.type : '';
      const isServerOfferPush =
        type === 'driver:request' && notification.request.identifier !== OFFER_ALERT_ID;

      if (isServerOfferPush) {
        const open = useTaskStore.getState().incomingRequest as
          | { task?: { id?: string } }
          | null;
        const sameOffer =
          !!open?.task?.id && (!data?.taskId || String(data.taskId) === String(open.task.id));
        if (sameOffer) {
          // The local offer alert already owns the tray slot and the sound.
          return {
            shouldShowBanner: false,
            shouldShowList: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }
      }
    } catch {
      // Never let dedup logic swallow a notification — fall through to showing it.
    }

    return show;
  },
});

// On Android 8+ the SOUND is a property of the notification CHANNEL, not the
// payload — so `sound: true` above was being ignored, because no channel had
// ever been created and everything landed on the implicit default one. Created
// once at launch, before any notification can be scheduled.
configureNotificationChannels();

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
  const { isAuthenticated, setAccessToken } = useAuthStore();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  // True once we've attempted to rehydrate the access token from SecureStore.
  // The auth guard must NOT redirect to login before this — on app restart the
  // persisted `user` loads but the token (SecureStore-only) is restored async,
  // so isAuthenticated is briefly false. Redirecting in that window is the
  // "register/relogin sometimes bounces back to login" bug.
  const [hydrationDone, setHydrationDone] = useState(false);

  // Connect to Supabase Realtime when authenticated
  useRealtime();

  // Global incoming call listener — navigates to call screen on call:incoming event
  useIncomingCall();

  // ============================================
  // ROOT AUTH GUARD (CB12)
  // ============================================
  // Without this guard, ANY non-tab screen (/wallet, /chat/*, /rider/*,
  // /orders/*, /health/*, /notifications, /sos, etc.) could be opened via a
  // deep link without authentication, showing broken UI or leaking data.
  // The (tabs)/_layout.tsx guard only protects tab screens.
  //
  // Public routes (accessible without auth):
  //   - auth/*            (login, register, forgot-password, verify-otp, etc.)
  //   - index             (splash / landing)
  //
  // Everything else requires isAuthenticated. If an unauthenticated user
  // lands on a protected route (e.g. via deep link), redirect to login.
  useEffect(() => {
    // Navigation must be ready before we can redirect.
    if (!navigationState?.key) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === 'auth';
    const isPublicRoute = inAuthGroup || firstSegment === 'index' || firstSegment === undefined;

    // Wait for the token-rehydration attempt to finish before bouncing to
    // login, otherwise a restart on a protected route redirects during the
    // brief window where the token hasn't been restored yet.
    if (hydrationDone && !isAuthenticated && !isPublicRoute) {
      // Use replace so the user can't press "back" into the protected screen.
      router.replace('/auth/login');
    }
  }, [isAuthenticated, segments, navigationState?.key, hydrationDone]);

  // Rehydrate access token from SecureStore on app start.
  // accessToken is NOT persisted in AsyncStorage (SecureStore only), so it must
  // be loaded back and set in the store, otherwise every app restart lands on
  // the welcome/login screen even though the user is still signed in.
  //
  // TWO things that previously broke this and kept restarts logged out:
  //   1. The restore was gated on `user` being present. But zustand's persist
  //      middleware hydrates `user` from AsyncStorage ASYNCHRONOUSLY, so at mount
  //      `user` is still null and the gate skipped the restore entirely.
  //   2. Restoring the token before `user` finished hydrating meant role-based
  //      routing ran with an undefined role.
  // Fix: wait for zustand persist to finish hydrating `user`, THEN read the
  // token from SecureStore unconditionally. SecureStore is the source of truth
  // for the session — logout() clears it — so a token present here means a valid
  // signed-in session to restore.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const { secureStorage } = require('../src/utils/secureStorage');
        const token = await secureStorage.getAccessToken();
        if (!cancelled && token) {
          setAccessToken(token);
          console.log('[App] Access token rehydrated from SecureStore');
        }
      } catch (e) {
        console.warn('[App] Failed to rehydrate token from SecureStore:', e);
      } finally {
        // Mark hydration complete so the guard can act (redirect a truly
        // logged-out user, or allow a rehydrated one through).
        if (!cancelled) setHydrationDone(true);
      }
    };

    if (useAuthStore.persist.hasHydrated()) {
      restoreSession();
      return () => { cancelled = true; };
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => restoreSession());
    return () => { cancelled = true; unsub?.(); };
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
            const type = String(data?.type ?? '');

            // A dispatch offer is the one notification that is time-critical
            // and actionable, and it was the one this handler ignored: the
            // push carries `type: 'driver:request'`, which matched neither
            // branch below ('driver:request'.includes('RIDE') is false), so
            // tapping an incoming delivery offer did nothing at all. Even a
            // match would have sent the courier to /(tabs)/rides — the
            // CLIENT's tab.
            //
            // Route to the driver dashboard, which owns the offer sheet: the
            // socket event restores `incomingRequest`, and if the offer has
            // since expired the dashboard simply shows no sheet rather than a
            // stale one. The SLA stays server-authoritative either way.
            if (type === 'driver:request' || type.startsWith('driver:')) {
              router.push('/driver' as never);
              return;
            }

            if (data?.entityType === 'task' || type.includes('RIDE')) {
              router.push('/(tabs)/rides');
            } else if (data?.entityType === 'order' || type.includes('ORDER')) {
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
          <Stack.Screen name="driver/deliveries" />
          <Stack.Screen name="wallet/index" />
          <Stack.Screen name="wallet/transactions" />
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
          <Stack.Screen name="rider/earnings" options={{ headerShown: false }} />
          <Stack.Screen name="rider/wallet" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacist/index" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacist/orders" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacist/orders/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacist/catalog" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacist/prescriptions" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacist/earnings" options={{ headerShown: false }} />
          <Stack.Screen name="rider/history" options={{ headerShown: false }} />
          <Stack.Screen name="rider/trip-details" options={{ headerShown: false }} />
          <Stack.Screen name="rider/trip-summary" options={{ headerShown: false }} />
          <Stack.Screen name="driver/reputation" options={{ headerShown: false }} />
          <Stack.Screen name="settings/index" options={{ headerShown: false }} />
          <Stack.Screen name="receipt/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="help-center" options={{ headerShown: false }} />
        </Stack>
      </ProviderErrorBoundary>
      {/* Global branded feedback (modals + toasts) — replaces native Alert.alert */}
      <FeedbackHost />
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
// The root error boundary can catch a failure in ThemeProvider itself, so it
// renders outside the context and cannot read tokens from a hook. Deriving the
// light palette directly keeps it from drifting away from the real theme.
const FALLBACK = makeThemedColors(false);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FALLBACK.surface,
    padding: 20,
  },
  errorTitle: {
    color: FALLBACK.error,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorText: {
    color: FALLBACK.onSurface,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorHint: {
    color: FALLBACK.outline,
    fontSize: 12,
  },
});
