// ============================================
// SMART RIDE MOBILE — Sentry Configuration
// ============================================
// Error monitoring for the Expo React Native app.
// Call initSentry() once in the root layout
// before any other code.
// ============================================

import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

/**
 * Initialize Sentry for the mobile app.
 * Call this once in App.tsx or root layout before any other code.
 */
export function initSentry(): void {
  // Guard: skip if DSN is empty or still a placeholder
  if (!SENTRY_DSN || SENTRY_DSN.startsWith('REPLACE_')) {
    console.warn('[Sentry] DSN not configured — error monitoring disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: __DEV__,
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
      enableNativeCrashHandling: true,
      attachStacktrace: true,
    });
    console.log('[Sentry] Initialized');
  } catch (err) {
    // Sentry.init should never crash the app — if it does, catch and log
    console.warn('[Sentry] Failed to initialize (non-fatal):', err);
  }
}

/**
 * Capture an exception in Sentry with optional context.
 * Safe to call even when Sentry is not configured (no-op).
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (error instanceof Error) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    Sentry.captureException(new Error(String(error)), {
      extra: context,
    });
  }
}

/**
 * Capture a message in Sentry (for non-exception events).
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for Sentry (call after login).
 * This lets you see which user was affected by an error.
 */
export function setUserContext(user: { id: string; email?: string; role?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.role,
  });
}

/**
 * Clear user context (call on logout).
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for tracing user actions.
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}): void {
  Sentry.addBreadcrumb({
    category: breadcrumb.category,
    message: breadcrumb.message,
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
  });
}
