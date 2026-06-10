// ============================================
// SMART RIDE — Next.js Instrumentation Hook
// ============================================
// This file is automatically loaded by Next.js
// at startup. It initializes Sentry on the server
// and edge runtimes.
//
// The client runtime is handled by
// sentry.client.config.ts (auto-loaded by @sentry/nextjs).
// ============================================

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../../sentry.edge.config');
  }
}
