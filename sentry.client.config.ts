// ============================================
// SMART RIDE — Sentry Client (Browser) Configuration
// ============================================
// Runs in the BROWSER. Captures React errors, unhandled exceptions,
// and performance data. Auto-loaded by @sentry/nextjs.
// ============================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Public DSN (safe to expose). Uses NEXT_PUBLIC_SENTRY_DSN.
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay: 10% of all sessions, 100% of sessions with errors
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Enable Sentry Logs (structured log search in dashboard)
  enableLogs: true,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Only active in production or when DSN is explicitly set
  enabled: process.env.NODE_ENV === 'production' || !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV || 'development',

  // Release = git commit SHA (auto-set by Vercel) or version tag
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || 'dev',

  // Ignore common noisy browser errors
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

  // Don't send PII (emails, IPs) to Sentry
  sendDefaultPii: false,
});
