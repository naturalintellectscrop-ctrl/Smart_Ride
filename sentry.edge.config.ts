// ============================================
// SMART RIDE — Sentry Edge Configuration
// ============================================
// Runs in Edge Runtime (middleware, edge functions).
// Minimal config since edge runtime has limitations (no includeLocalVariables).
// Loaded by instrumentation.ts when NEXT_RUNTIME === 'edge'.
// ============================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Edge DSN (secret). Falls back to the public DSN if unset.
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Only active in production or when DSN is set
  enabled: process.env.NODE_ENV === 'production' || !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

  environment: process.env.NODE_ENV || 'development',

  // Enable Sentry Logs in edge runtime
  enableLogs: true,

  // Don't send PII
  sendDefaultPii: false,
});
