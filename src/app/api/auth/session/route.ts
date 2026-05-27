/**
 * GET /api/auth/session
 * Check admin session validity
 * SECURITY: Uses the SAME JWT secret as the login/signing flow (jsonwebtoken)
 * Previously used jose with a DIFFERENT secret, causing all sessions to fail.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from '@/lib/auth/jwt';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Try to get token from admin-session cookie (admin dashboard)
    const cookieToken = request.cookies.get('admin-session')?.value;
    // Also check Authorization header (mobile/API clients)
    const authHeader = request.headers.get('authorization');
    const headerToken = extractTokenFromHeader(authHeader);

    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Verify token using the SAME method as all other auth checks
    const payload: JWTPayload | null = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Get fresh user data (only essential fields)
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
