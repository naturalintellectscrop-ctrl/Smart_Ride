/**
 * Security Headers Middleware
 * 
 * Adds security headers to all responses:
 * - Content-Security-Policy
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Strict-Transport-Security
 * - X-XSS-Protection
 * - Referrer-Policy
 * - Permissions-Policy
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Security Headers Configuration
// ============================================================================

interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  xFrameOptions?: string;
  xContentTypeOptions?: string;
  strictTransportSecurity?: string;
  xXssProtection?: string;
  referrerPolicy?: string;
  permissionsPolicy?: string;
}

const DEFAULT_CONFIG: SecurityHeadersConfig = {
  // Content Security Policy
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-inline needed for Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; '),
  
  // Prevent clickjacking
  xFrameOptions: 'DENY',
  
  // Prevent MIME type sniffing
  xContentTypeOptions: 'nosniff',
  
  // HSTS (1 year, include subdomains)
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  
  // XSS Protection (legacy but still useful)
  xXssProtection: '1; mode=block',
  
  // Referrer Policy
  referrerPolicy: 'strict-origin-when-cross-origin',
  
  // Permissions Policy
  permissionsPolicy: [
    'camera=()',
    'microphone=()',
    'geolocation=(self)',
    'payment=(self)',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ].join(', '),
};

// ============================================================================
// Security Headers Middleware
// ============================================================================

/**
 * Add security headers to response
 */
export function addSecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = DEFAULT_CONFIG
): NextResponse {
  // Content Security Policy
  if (config.contentSecurityPolicy) {
    response.headers.set('Content-Security-Policy', config.contentSecurityPolicy);
  }
  
  // X-Frame-Options
  if (config.xFrameOptions) {
    response.headers.set('X-Frame-Options', config.xFrameOptions);
  }
  
  // X-Content-Type-Options
  if (config.xContentTypeOptions) {
    response.headers.set('X-Content-Type-Options', config.xContentTypeOptions);
  }
  
  // Strict-Transport-Security (only in production with HTTPS)
  if (config.strictTransportSecurity && process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', config.strictTransportSecurity);
  }
  
  // X-XSS-Protection
  if (config.xXssProtection) {
    response.headers.set('X-XSS-Protection', config.xXssProtection);
  }
  
  // Referrer-Policy
  if (config.referrerPolicy) {
    response.headers.set('Referrer-Policy', config.referrerPolicy);
  }
  
  // Permissions-Policy
  if (config.permissionsPolicy) {
    response.headers.set('Permissions-Policy', config.permissionsPolicy);
  }
  
  // Additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Remove server identification
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');
  
  return response;
}

/**
 * Create CSP header for API routes (more restrictive)
 */
export function getApiSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
}

/**
 * Apply security headers to API response
 */
export function secureApiResponse(response: NextResponse): NextResponse {
  const headers = getApiSecurityHeaders();
  
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  
  return response;
}

// ============================================================================
// CORS Configuration
// ============================================================================

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_API_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:19006',
  'exp://localhost:19000',
].filter(Boolean) as string[];

/**
 * Handle CORS for API routes
 */
export function handleCors(
  request: NextRequest,
  response: NextResponse,
  allowedOrigins: string[] = ALLOWED_ORIGINS
): NextResponse {
  const origin = request.headers.get('origin');
  
  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Api-Key',
      'X-Device-Id',
      'X-Request-Id',
    ].join(', '));
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }
  
  return response;
}

/**
 * Handle OPTIONS preflight request
 */
export function handlePreflight(
  request: NextRequest,
  allowedOrigins: string[] = ALLOWED_ORIGINS
): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return handleCors(request, response, allowedOrigins);
}

// ============================================================================
// Middleware Wrapper
// ============================================================================

/**
 * Wrap API handler with security headers
 */
export function withSecurityHeaders(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: unknown): Promise<NextResponse> => {
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return handlePreflight(req);
    }
    
    // Execute handler
    const response = await handler(req, context);
    
    // Apply security headers
    secureApiResponse(response);
    
    // Handle CORS
    handleCors(req, response);
    
    return response;
  };
}
