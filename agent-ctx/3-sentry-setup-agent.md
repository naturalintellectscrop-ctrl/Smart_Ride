# Task 3-Sentry: Sentry Error Monitoring Setup

## Summary
Set up Sentry error monitoring for both the Next.js web app and the Expo React Native mobile app.

## What was already done (previous agent)
- `sentry.client.config.ts` — browser-side config with replay rates, ignoreErrors
- `sentry.server.config.ts` — server-side config for API/SSR errors
- `sentry.edge.config.ts` — edge runtime config
- `src/lib/sentry.ts` — utility functions (captureException, captureMessage, setUserContext, addBreadcrumb, withSentry)
- `src/app/global-error.tsx` — root layout error handler with Sentry reporting
- `src/app/error.tsx` — error boundary with Sentry reporting
- `next.config.ts` — wrapped with `withSentryConfig()`
- `@sentry/nextjs` installed
- `.env` / `.env.example` — had Sentry DSN vars

## What I added/fixed

### Next.js — Critical missing piece
1. **`src/app/instrumentation.ts`** (CREATED) — The Next.js instrumentation hook. Without this, server-side and edge Sentry configs were never loaded. Now they load at startup via `register()`.

2. **`sentry.client.config.ts`** (UPDATED) — Added `Sentry.replayIntegration()` to integrations array (required for Session Replay to actually capture data).

3. **`src/lib/sentry.ts`** (UPDATED) — Added `withSentryApiHandler<T>()` utility that wraps API route handlers with Sentry scope tagging and automatic error capture.

### Expo React Native — Full new setup
4. **Installed `@sentry/react-native@8.13.0`** in expo-app

5. **`expo-app/src/lib/sentry.ts`** (CREATED) — Complete Sentry mobile SDK:
   - `initSentry()` — initializes with DSN, debug mode, native crash handling
   - `captureException()` — captures errors with optional context
   - `captureMessage()` — captures non-exception messages
   - `setUserContext()` / `clearUserContext()` — user attribution
   - `addBreadcrumb()` — user action tracing

6. **`expo-app/app/_layout.tsx`** (UPDATED) — Added `initSentry()` call right after imports, before any other code runs

7. **`expo-app/src/store/authStore.ts`** (UPDATED) — Wired Sentry user context:
   - `login()` → calls `setUserContext()`
   - `logout()` → calls `clearUserContext()`
   - `setUser()` → conditionally sets/clears context

8. **`expo-app/.env`** (UPDATED) — Added `EXPO_PUBLIC_SENTRY_DSN` (commented out)

9. **`.env.example`** (UPDATED) — Added `SENTRY_AUTH_TOKEN` and `EXPO_PUBLIC_SENTRY_DSN`

### Configuration verified
- `next.config.ts` — already has `withSentryConfig()` with `hideSourceMaps: true`, conditional webpack plugins
- Dev server runs fine after changes
- Lint passes (pre-existing `decimal.d.ts` errors unrelated)

## Design decisions
- **No hardcoded DSNs** — all use env variables, empty by default
- **Zero impact until DSN configured** — Sentry is disabled/no-op when DSN is empty
- **Existing configs preserved** — the previous agent's production-ready configs (ignoreErrors, enabled flag, environment, release) were kept and enhanced rather than replaced
- **Auth store integration** — uses direct function calls (not middleware) for clarity and reliability
