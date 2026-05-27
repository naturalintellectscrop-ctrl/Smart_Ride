/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * SECURITY: Supports both mobile (body) and admin dashboard (cookie) refresh
 * Refresh token rotation: old token is invalidated, new token issued
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
    // Get refresh token from cookies (web/admin) or body (mobile)
    const mobileRefreshToken = request.cookies.get('refreshToken')?.value;
    const adminRefreshToken = request.cookies.get('admin_refresh_token')?.value;
    const body = await request.json().catch(() => ({}));
    
    const validationResult = refreshRequestSchema.safeParse(body);
    const { refreshToken: bodyRefreshToken, deviceId } = validationResult.success 
      ? validationResult.data 
      : { refreshToken: undefined, deviceId: undefined };
    
    // Priority: body (mobile) > admin cookie > mobile cookie
    const refreshToken = bodyRefreshToken || adminRefreshToken || mobileRefreshToken;

    if (!refreshToken) {
      return errorResponse('Refresh token required', 401);
    }

    // Refresh session - this also rotates the refresh token
    const result = await refreshSession(refreshToken, deviceId);

    if (!result.success) {
      // SECURITY: Audit failed refresh attempt
      try {
        const { db } = await import('@/lib/db');
        await db.auditLog.create({
          data: {
            actorType: 'SYSTEM',
            action: 'TOKEN_REFRESH_FAILED',
            entityType: 'SESSION',
            entityId: 'refresh',
            description: `Token refresh failed: ${result.error}`,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
            userAgent: request.headers.get('user-agent'),
          },
        });
      } catch {}
      
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

    // Update admin-session cookie with new access token (for admin dashboard)
    if (adminRefreshToken) {
      response.cookies.set('admin-session', result.accessToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });
    }

    // Set new refresh token as HTTP-only cookie for web clients
    if (result.refreshToken) {
      // Mobile client cookie
      if (mobileRefreshToken) {
        response.cookies.set('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: '/',
        });
      }
      // Admin dashboard cookie
      if (adminRefreshToken) {
        response.cookies.set('admin_refresh_token', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: '/admin',
        });
      }
    }

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return serverErrorResponse('Failed to refresh token');
  }
}
