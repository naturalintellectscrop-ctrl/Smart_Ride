// ============================================
// SMART RIDE — Sentry Utilities
// ============================================
// Helper functions for Sentry error reporting
// across API routes and server components.
// ============================================

import * as Sentry from '@sentry/nextjs';

/**
 * Capture an exception in Sentry.
 * Safe to call even when Sentry is not configured (no-op).
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
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
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Add user context to Sentry for error attribution.
 */
export function setUserContext(user: { id: string; email?: string; role?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.role,
  });
}

/**
 * Clear user context (on logout).
 */
export function clearUserContext(): void {
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

/**
 * Wrap an API route handler with Sentry error capture.
 * Use this for all API routes to automatically capture unhandled errors.
 *
 * @example
 * export const GET = withSentry(async (req) => {
 *   // your handler code
 * }, 'GET /api/tasks');
 */
export function withSentry<T>(
  handler: () => Promise<T>,
  routeLabel: string
): Promise<T> {
  return Sentry.startSpan({ name: routeLabel, op: 'http.server' }, async () => {
    try {
      return await handler();
    } catch (error) {
      captureException(error, { route: routeLabel });
      throw error; // Re-throw so Next.js can handle it too
    }
  });
}

/**
 * Wrap an API route handler with Sentry error tracking and scope.
 * Tags the route name for easy filtering in the Sentry dashboard.
 *
 * @example
 * export const POST = withSentryApiHandler(async (req) => {
 *   // your handler code
 * }, 'POST /api/tasks');
 */
export function withSentryApiHandler<T extends (...args: any[]) => any>(
  handler: T,
  routeName: string
): T {
  return ((...args: any[]) => {
    return Sentry.withScope(async () => {
      Sentry.setTag('api.route', routeName);
      try {
        return await handler(...args);
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    });
  }) as T;
}
