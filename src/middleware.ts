/**
 * Next.js Edge Middleware
 *
 * Runs on every matched request and:
 * - Generates and propagates x-request-id headers
 * - Applies security headers to API responses
 * - Handles CORS for API routes (including OPTIONS preflight)
 * - Applies a lighter set of security headers to page responses
 *
 * IMPORTANT: This runs in the Edge runtime — do NOT use Node.js-specific
 * APIs (Buffer, fs, etc.) or import Prisma/db code.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  addSecurityHeaders,
  handleCors,
  handlePreflight,
} from '@/lib/security/security-headers';

// Lighter security headers for page (non-API) responses
const PAGE_SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN', // Allow framing from same origin (less restrictive than DENY)
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api');

  // 1. Generate or propagate request ID
  const requestId =
    request.headers.get('x-request-id') || crypto.randomUUID();

  // 2. Handle CORS preflight for API routes (return immediately)
  if (isApiRoute && request.method === 'OPTIONS') {
    const response = handlePreflight(request);
    response.headers.set('x-request-id', requestId);
    return response;
  }

  // 3. Clone request headers with x-request-id for downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // 4. Continue processing the request
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // 5. Add request ID to response so callers can trace the request
  response.headers.set('x-request-id', requestId);

  // 6. Apply security headers based on route type
  if (isApiRoute) {
    // Full security headers + CORS for API routes
    addSecurityHeaders(response);
    handleCors(request, response);
  } else {
    // Lighter security headers for page routes
    for (const [key, value] of Object.entries(PAGE_SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
    // Remove server identification from page responses too
    response.headers.delete('X-Powered-By');
    response.headers.delete('Server');
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    // Exclude: _next internals, favicon, and the Sentry tunnel route
    // (/monitoring) which must NOT be touched by middleware/CORS/security headers
    // or ad-blocker bypass will break.
    '/((?!_next/static|_next/image|favicon.ico|monitoring).*)',
  ],
};
