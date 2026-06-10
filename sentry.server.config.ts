// ============================================
// SMART RIDE — Sentry Server Configuration
// ============================================
// Runs on the SERVER (Node.js). Captures API
// route errors, server-side rendering errors,
// and server-side performance data.
// ============================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  enabled: process.env.NODE_ENV === 'production' || !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV || 'development',

  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || 'dev',

  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network request failed',
    'prisma',
  ],

  sendDefaultPii: false,
});
