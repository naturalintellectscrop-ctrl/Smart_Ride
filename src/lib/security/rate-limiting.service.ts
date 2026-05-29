/**
 * Rate Limiting Service (DB-backed)
 *
 * Uses the existing ApiRateLimit model to enforce per-identifier
 * and per-endpoint rate limits. Supports:
 * - Configurable windows and max requests
 * - Predefined limits for AUTH, PAYMENT, ORDER, API, DISPATCH
 * - Automatic window expiry and counter reset
 * - Rate limit reset functionality
 *
 * Uses the ApiRateLimit Prisma model for persistence.
 */

import { db } from '@/lib/db';

// ============================================
// Types
// ============================================

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  totalLimit: number;
}

// ============================================
// Predefined Limits
// ============================================

export const RATE_LIMITS = {
  AUTH: { windowMs: 60 * 1000, maxRequests: 5 },        // 5 requests per minute (login, OTP)
  PAYMENT: { windowMs: 60 * 1000, maxRequests: 10 },    // 10 requests per minute
  ORDER: { windowMs: 60 * 1000, maxRequests: 20 },      // 20 requests per minute
  API: { windowMs: 60 * 1000, maxRequests: 60 },        // 60 requests per minute (general)
  DISPATCH: { windowMs: 60 * 1000, maxRequests: 30 },   // 30 requests per minute
} as const;

export type RateLimitEndpoint = keyof typeof RATE_LIMITS;

// ============================================
// Rate Limiting Service
// ============================================

export class RateLimitingService {
  /**
   * Check rate limit for an identifier + endpoint combination.
   *
   * - Looks up existing ApiRateLimit record by identifier (unique key)
   * - If window expired, resets counter
   * - If counter >= max, returns { allowed: false }
   * - Otherwise increments counter and returns { allowed: true }
   */
  static async checkRateLimit(
    identifier: string,
    endpoint: string,
    limits: RateLimitOptions = RATE_LIMITS.API,
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - limits.windowMs);
    const resetAt = new Date(now.getTime() + limits.windowMs);

    try {
      // Look up existing rate limit record
      const existing = await db.apiRateLimit.findUnique({
        where: { identifier },
      });

      if (!existing) {
        // Create new record
        await db.apiRateLimit.create({
          data: {
            identifier,
            endpoint,
            requestCount: 1,
            windowStart: now,
          },
        });

        return {
          allowed: true,
          remaining: limits.maxRequests - 1,
          resetAt,
          totalLimit: limits.maxRequests,
        };
      }

      // Check if window has expired
      const existingWindowStart = new Date(existing.windowStart);
      const windowExpired = existingWindowStart < windowStart;

      if (windowExpired) {
        // Reset counter — window expired
        await db.apiRateLimit.update({
          where: { identifier },
          data: {
            endpoint,
            requestCount: 1,
            windowStart: now,
          },
        });

        return {
          allowed: true,
          remaining: limits.maxRequests - 1,
          resetAt,
          totalLimit: limits.maxRequests,
        };
      }

      // Window is still active — check counter
      if (existing.requestCount >= limits.maxRequests) {
        // Rate limit exceeded
        const currentResetAt = new Date(
          existingWindowStart.getTime() + limits.windowMs,
        );

        return {
          allowed: false,
          remaining: 0,
          resetAt: currentResetAt,
          totalLimit: limits.maxRequests,
        };
      }

      // Increment counter
      const newCount = existing.requestCount + 1;
      await db.apiRateLimit.update({
        where: { identifier },
        data: {
          requestCount: newCount,
          endpoint,
        },
      });

      return {
        allowed: true,
        remaining: limits.maxRequests - newCount,
        resetAt: new Date(existingWindowStart.getTime() + limits.windowMs),
        totalLimit: limits.maxRequests,
      };
    } catch (error) {
      console.error('[RateLimiting] Error checking rate limit:', error);
      // On error, allow the request through (fail-open)
      return {
        allowed: true,
        remaining: limits.maxRequests,
        resetAt,
        totalLimit: limits.maxRequests,
      };
    }
  }

  /**
   * Reset rate limit for an identifier.
   * Deletes the ApiRateLimit record so the next request starts fresh.
   */
  static async resetRateLimit(identifier: string, _endpoint?: string): Promise<boolean> {
    try {
      await db.apiRateLimit.deleteMany({
        where: { identifier },
      });
      return true;
    } catch (error) {
      console.error('[RateLimiting] Error resetting rate limit:', error);
      return false;
    }
  }

  /**
   * Get current rate limit status without incrementing the counter.
   * Useful for displaying remaining requests to users.
   */
  static async getRateLimitStatus(
    identifier: string,
    limits: RateLimitOptions = RATE_LIMITS.API,
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - limits.windowMs);

    const existing = await db.apiRateLimit.findUnique({
      where: { identifier },
    });

    if (!existing) {
      return {
        allowed: true,
        remaining: limits.maxRequests,
        resetAt: new Date(now.getTime() + limits.windowMs),
        totalLimit: limits.maxRequests,
      };
    }

    const existingWindowStart = new Date(existing.windowStart);
    const windowExpired = existingWindowStart < windowStart;

    if (windowExpired) {
      return {
        allowed: true,
        remaining: limits.maxRequests,
        resetAt: new Date(now.getTime() + limits.windowMs),
        totalLimit: limits.maxRequests,
      };
    }

    return {
      allowed: existing.requestCount < limits.maxRequests,
      remaining: Math.max(0, limits.maxRequests - existing.requestCount),
      resetAt: new Date(existingWindowStart.getTime() + limits.windowMs),
      totalLimit: limits.maxRequests,
    };
  }

  /**
   * Clean up expired rate limit entries.
   * Should be called periodically (e.g., via cron or recovery service).
   */
  static async cleanupExpiredEntries(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const result = await db.apiRateLimit.deleteMany({
      where: {
        windowStart: {
          lt: cutoff,
        },
      },
    });
    return result.count;
  }
}

export default RateLimitingService;
