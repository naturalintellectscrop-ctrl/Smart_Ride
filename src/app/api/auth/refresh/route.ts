/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/services/auth.service';
import { errorResponse, serverErrorResponse } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or body
    const cookieRefreshToken = request.cookies.get('refreshToken')?.value;
    const body = await request.json().catch(() => ({}));
    const refreshToken = cookieRefreshToken || body.refreshToken;

    if (!refreshToken) {
      return errorResponse('Refresh token required', 401);
    }

    // Refresh token
    const result = await refreshAccessToken(refreshToken);

    if (!result.success) {
      return errorResponse(result.error || 'Token refresh failed', 401);
    }

    // Set new refresh token as HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens?.accessToken,
        expiresIn: result.tokens?.expiresIn,
      },
      message: 'Token refreshed',
    });

    if (result.tokens?.refreshToken) {
      response.cookies.set('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return serverErrorResponse('Failed to refresh token');
  }
}
