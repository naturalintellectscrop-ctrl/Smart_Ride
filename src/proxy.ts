/**
 * Next.js Edge Proxy (Next.js 16 convention)
 *
 * Runs on every matched request and:
 * - Generates and propagates x-request-id headers
 * - Applies security headers to API responses
 * - Handles CORS for API routes (including OPTIONS preflight)
 * - Protects authenticated routes (admin, auth pages)
 * - Validates JWT tokens and sets user context headers
 *
 * IMPORTANT: This runs in the Edge runtime — do NOT use Node.js-specific
 * APIs (Buffer, fs, etc.) or import Prisma/db code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// ============================================
// Route Protection Configuration
// ============================================

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/admin',
];

// Routes that redirect to home if already authenticated
const GUEST_ONLY_ROUTES = [
  '/auth/login',
  '/auth/signup',
  '/forgot-password',
  '/reset-password',
];

// Routes that are always public
const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/help',
  '/contact',
  '/blog',
  '/terms',
  '/privacy',
  '/offline',
];

// Admin routes that require admin role
const ADMIN_ROUTES = [
  '/admin',
];

// ============================================
// JWT Verification (Edge-compatible using jose)
// ============================================

async function verifyTokenEdge(token: string): Promise<{ userId: string; role: string; email: string } | null> {
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'dev-jwt-secret-not-for-production-use'
    );
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'smart-ride',
      audience: 'smart-ride-api',
    });
    return {
      userId: payload.userId as string,
      role: payload.role as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

function getTokenFromRequest(req: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  // Try cookie
  const cookieToken = req.cookies.get('accessToken')?.value;
  if (cookieToken) return cookieToken;
  return null;
}

// ============================================
// Route Matching Helpers
// ============================================

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

function isGuestOnlyRoute(pathname: string): boolean {
  return GUEST_ONLY_ROUTES.some(route => pathname.startsWith(route));
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route));
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/api/');
}

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'];

// ============================================
// Main Proxy Function
// ============================================

export async function proxy(request: NextRequest) {
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

  // ============================================
  // Route Protection (non-API routes only)
  // ============================================
  if (!isApiRoute) {
    const token = getTokenFromRequest(request);
    const user = token ? await verifyTokenEdge(token) : null;

    // Protect admin routes - redirect to admin login if not authenticated
    if (isProtectedRoute(pathname) && !user) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Protect admin routes - redirect non-admin users to home
    if (isAdminRoute(pathname) && user && !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Redirect authenticated users away from guest-only pages
    if (isGuestOnlyRoute(pathname) && user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ============================================
  // Continue Processing
  // ============================================

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
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|robots\\.txt|firebase-messaging-sw\\.js).*)',
  ],
};
