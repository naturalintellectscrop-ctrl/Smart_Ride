/**
 * Next.js Edge Proxy (Next.js 16 convention)
 *
 * Runs on every matched request and:
 * - Generates and propagates x-request-id headers
 * - Applies security headers to API responses
 * - Handles CORS for API routes (including OPTIONS preflight)
 *
 * IMPORTANT: This runs in the Edge runtime — do NOT use Node.js-specific
 * APIs (Buffer, fs, etc.) or import Prisma/db code.
 */

import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api');

  // Generate or propagate request ID
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  // Handle CORS preflight for API routes
  if (isApiRoute && request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('x-request-id', requestId);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  // Clone request headers with x-request-id
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // Continue processing the request
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Add request ID to response
  response.headers.set('x-request-id', requestId);

  // Apply security headers
  if (isApiRoute) {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id');
  } else {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.delete('X-Powered-By');
    response.headers.delete('Server');
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
