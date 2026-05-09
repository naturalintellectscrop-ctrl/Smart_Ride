/**
 * Rate Limiting Service
 * Prevents abuse of API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RateLimitConfig {
  windowMs: number;       // Time window in milliseconds
  maxRequests: number;    // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string;
  skipFailedRequests?: boolean;
}

// In-memory store for development (use Redis in production)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetTime < now) {
      memoryStore.delete(key);
    }
  }
}, 60000);

/**
 * Default key generator - uses IP address or user ID
 */
function defaultKeyGenerator(req: NextRequest): string {
  // Try to get user ID from auth header
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      // Use token hash as key (don't store the actual token)
      return `user:${token.substring(0, 16)}`;
    }
  }
  
  // Fall back to IP address
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipFailedRequests = false,
  } = config;

  return async (
    req: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const key = keyGenerator(req);
    const now = Date.now();
    const resetTime = now + windowMs;

    // Get current count from memory store
    const current = memoryStore.get(key);

    let count: number;
    let remaining: number;
    let reset: number;

    if (!current || current.resetTime < now) {
      // Start new window
      count = 1;
      remaining = maxRequests - 1;
      reset = resetTime;
      memoryStore.set(key, { count, resetTime });
    } else {
      // Increment in existing window
      count = current.count + 1;
      remaining = Math.max(0, maxRequests - count);
      reset = current.resetTime;
      memoryStore.set(key, { count, resetTime: current.resetTime });
    }

    // Check if limit exceeded
    if (count > maxRequests) {
      const retryAfter = Math.ceil((reset - now) / 1000);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
          },
        }
      );
    }

    // Execute handler
    const response = await handler();

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(reset / 1000)));

    return response;
  };
}

/**
 * Predefined rate limit configurations
 */
export const rateLimits = {
  // Authentication endpoints - strict
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  }),
  
  // API endpoints - moderate
  api: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  }),
  
  // Public endpoints - lenient
  public: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  }),
  
  // Search endpoints - moderate
  search: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  }),
  
  // Payment endpoints - strict
  payment: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  }),
};

/**
 * Higher-order function to wrap API handlers with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>,
  config: RateLimitConfig = rateLimits.api.config
) {
  const limiter = rateLimit(config);
  
  return async (req: NextRequest, context?: unknown) => {
    return limiter(req, () => handler(req, context));
  };
}
