/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshSession } from '@/lib/auth/session-service';
import { errorResponse, serverErrorResponse } from '@/lib/api/response';
import { z } from 'zod';

const refreshRequestSchema = z.object({
  refreshToken: z.string().optional(),
  deviceId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or body
    const cookieRefreshToken = request.cookies.get('refreshToken')?.value;
    const body = await request.json().catch(() => ({}));
    
    const validationResult = refreshRequestSchema.safeParse(body);
    const { refreshToken: bodyRefreshToken, deviceId } = validationResult.success 
      ? validationResult.data 
      : { refreshToken: undefined, deviceId: undefined };
    
    const refreshToken = cookieRefreshToken || bodyRefreshToken;

    if (!refreshToken) {
      return errorResponse('Refresh token required', 401);
    }

    // Refresh session
    const result = await refreshSession(refreshToken, deviceId);

    if (!result.success) {
      return errorResponse(result.error || 'Token refresh failed', 401);
    }

    // Return tokens - BOTH accessToken AND refreshToken
    const response = NextResponse.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken, // New refresh token (rotation)
        expiresIn: result.expiresIn,
      },
      message: 'Token refreshed',
    });

    // Set new refresh token as HTTP-only cookie for web clients
    if (result.refreshToken) {
      response.cookies.set('refreshToken', result.refreshToken, {
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
