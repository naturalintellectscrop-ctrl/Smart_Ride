// ============================================
// SMART RIDE — Sentry Client Configuration
// ============================================
// Runs in the BROWSER. Captures React errors,
// unhandled exceptions, and performance data.
// ============================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Set your Sentry DSN in .env as NEXT_PUBLIC_SENTRY_DSN
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust sample rates based on your traffic volume
  // For production with high traffic, reduce these values
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Replay configuration (captures session video for debugging)
  replaysOnErrorSampleRate: 1.0, // Always capture on errors
  replaysSessionSampleRate: 0.1, // Sample 10% of normal sessions

  // Enable Session Replay (requires explicit integration)
  integrations: [
    Sentry.replayIntegration(),
  ],

  // Only enable in production or when DSN is set
  enabled: process.env.NODE_ENV === 'production' || !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release version (set during CI/CD)
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || 'dev',

  // Ignore common noisy errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    'Non-Error promise rejection captured',
    'clarity.js',
    'ChunkLoadError',
  ],

  // Don't send PII
  sendDefaultPii: false,
});
