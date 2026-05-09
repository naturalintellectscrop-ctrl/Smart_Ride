/**
 * Rate Limiting System
 * Production-grade rate limiting with IP and user-based limiting
 * 
 * Features:
 * - IP-based limiting
 * - User-based limiting (when authenticated)
 * - Redis-ready structure (uses memory for development)
 * - Per-endpoint configurations
 * - Automatic cleanup of expired entries
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;           // Time window in milliseconds
  maxRequests: number;        // Maximum requests per window
  keyPrefix?: string;         // Prefix for storage keys
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  message?: string;           // Custom error message
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// ============================================================================
// Storage
// ============================================================================

// In-memory store (replace with Redis in production)
const memoryStore = new Map<string, RateLimitEntry>();

// Cleanup interval (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.resetTime < now) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

// ============================================================================
// Key Generators
// ============================================================================

/**
 * Extract client IP from request
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback for development
  return '127.0.0.1';
}

/**
 * Extract user ID from JWT token (if authenticated)
 */
function extractUserId(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    // Simple extraction without verification - just for rate limiting key
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.userId || null;
  } catch {
    return null;
  }
}

/**
 * Generate rate limit key (IP + optional user ID)
 */
function generateKey(req: NextRequest, config: RateLimitConfig): string {
  const ip = getClientIp(req);
  const userId = extractUserId(req);
  const prefix = config.keyPrefix || 'ratelimit';
  
  // Use user ID if authenticated, otherwise IP
  if (userId) {
    return `${prefix}:user:${userId}`;
  }
  
  return `${prefix}:ip:${ip}`;
}

// ============================================================================
// Core Rate Limiter
// ============================================================================

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): RateLimitResult {
  const key = generateKey(req, config);
  const now = Date.now();
  const resetTime = now + config.windowMs;
  
  const entry = memoryStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    // New window
    memoryStore.set(key, {
      count: 1,
      resetTime,
      blocked: false,
    });
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: Math.ceil(resetTime / 1000),
    };
  }
  
  // Existing window
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: Math.ceil(entry.resetTime / 1000),
      retryAfter,
    };
  }
  
  // Increment counter
  entry.count += 1;
  memoryStore.set(key, entry);
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    reset: Math.ceil(entry.resetTime / 1000),
  };
}

/**
 * Create rate limit response
 */
export function rateLimitResponse(
  result: RateLimitResult,
  config: RateLimitConfig
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: config.message || 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter || 60),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
        'X-RateLimit-Resource': config.keyPrefix || 'default',
      },
    }
  );
}

// ============================================================================
// Predefined Configurations
// ============================================================================

export const RATE_LIMITS = {
  // Authentication endpoints - VERY STRICT
  auth: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      keyPrefix: 'auth:login',
      message: 'Too many login attempts. Please try again in 15 minutes.',
    } as RateLimitConfig,
    
    sendOtp: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5,
      keyPrefix: 'auth:otp:send',
      message: 'Too many OTP requests. Please try again in 1 hour.',
    } as RateLimitConfig,
    
    verifyOtp: {
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxRequests: 10,
      keyPrefix: 'auth:otp:verify',
      message: 'Too many OTP verification attempts. Please try again in 10 minutes.',
    } as RateLimitConfig,
    
    register: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      keyPrefix: 'auth:register',
      message: 'Too many registration attempts. Please try again in 1 hour.',
    } as RateLimitConfig,
  },
  
  // Payment endpoints - STRICT
  payment: {
    initiate: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5,
      keyPrefix: 'payment:initiate',
      message: 'Too many payment requests. Please slow down.',
    } as RateLimitConfig,
    
    callback: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // Higher for webhooks (should be IP restricted)
      keyPrefix: 'payment:callback',
    } as RateLimitConfig,
  },
  
  // API endpoints - MODERATE
  api: {
    standard: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60,
      keyPrefix: 'api',
    } as RateLimitConfig,
    
    search: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      keyPrefix: 'api:search',
    } as RateLimitConfig,
    
    write: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20,
      keyPrefix: 'api:write',
    } as RateLimitConfig,
  },
  
  // Public endpoints - LENIENT
  public: {
    standard: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyPrefix: 'public',
    } as RateLimitConfig,
  },
  
  // Admin endpoints
  admin: {
    standard: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyPrefix: 'admin',
    } as RateLimitConfig,
    
    critical: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      keyPrefix: 'admin:critical',
      message: 'Too many critical admin actions. Please try again later.',
    } as RateLimitConfig,
  },
} as const;

// ============================================================================
// Middleware Wrapper
// ============================================================================

/**
 * Wrap an API handler with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async (req: NextRequest, context?: unknown): Promise<NextResponse> => {
    const result = checkRateLimit(req, config);
    
    if (!result.success) {
      return rateLimitResponse(result, config);
    }
    
    const response = await handler(req, context);
    
    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', String(result.limit));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(result.reset));
    
    return response;
  };
}

// ============================================================================
// Blocking System (for persistent offenders)
// ============================================================================

const blockedIps = new Map<string, { reason: string; until: number }>();

/**
 * Block an IP address
 */
export function blockIp(ip: string, reason: string, durationMs: number = 24 * 60 * 60 * 1000): void {
  blockedIps.set(ip, {
    reason,
    until: Date.now() + durationMs,
  });
}

/**
 * Check if IP is blocked
 */
export function isIpBlocked(ip: string): { blocked: boolean; reason?: string } {
  const block = blockedIps.get(ip);
  
  if (!block) {
    return { blocked: false };
  }
  
  if (block.until < Date.now()) {
    blockedIps.delete(ip);
    return { blocked: false };
  }
  
  return { blocked: true, reason: block.reason };
}

/**
 * Unblock an IP address
 */
export function unblockIp(ip: string): void {
  blockedIps.delete(ip);
}

// Export types
export type { RateLimitConfig as RateLimitConfigType };
