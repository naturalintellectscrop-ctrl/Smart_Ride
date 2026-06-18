// ============================================
// SMART RIDE — Next.js Instrumentation Hook
// ============================================
// This file is automatically loaded by Next.js at startup.
// It initializes Sentry on the server and edge runtimes.
//
// The client runtime is handled by sentry.client.config.ts
// (auto-loaded by @sentry/nextjs when NEXT_PUBLIC_SENTRY_DSN is set).
// ============================================

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../../sentry.edge.config');
  }
}

// ============================================
// Automatic Server Request Error Capture
// ============================================
// Requires @sentry/nextjs >= 8.28.0.
// Captures unhandled errors from API routes, server actions, and
// server components without needing manual try/catch + Sentry.captureException.
// ============================================
import * as Sentry from '@sentry/nextjs';

export const onRequestError = Sentry.captureRequestError;
