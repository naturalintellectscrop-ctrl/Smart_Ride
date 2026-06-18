// ============================================
// SMART RIDE — Sentry Server (Node.js) Configuration
// ============================================
// Runs on the SERVER (Node.js runtime). Captures API route errors,
// server-side rendering errors, and server-side performance data.
// Loaded by instrumentation.ts when NEXT_RUNTIME === 'nodejs'.
// ============================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Server-side DSN (secret). Falls back to the public DSN if unset.
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Only active in production or when DSN is set
  enabled: process.env.NODE_ENV === 'production' || !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

  environment: process.env.NODE_ENV || 'development',

  // Release = git commit SHA (auto-set by Vercel) or version tag
  release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || 'dev',

  // Attach local variable values to stack frames (server only —
  // gives richer context for debugging API route crashes)
  includeLocalVariables: true,

  // Enable Sentry Logs for structured server-side logging
  enableLogs: true,

  // Ignore noisy server-side errors (but NOT prisma errors — those are useful)
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network request failed',
  ],

  // Don't send PII
  sendDefaultPii: false,
});
