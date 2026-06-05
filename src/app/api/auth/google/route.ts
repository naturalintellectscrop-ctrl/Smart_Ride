/**
 * POST /api/auth/google
 * Authenticate user with Google ID token
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { createSession } from '@/lib/auth/session-service';
import { UserRole, UserStatus } from '@prisma/client';
import { errorResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';

interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
  sub: string; // Google user ID
}

async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo | null> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // Verify the token is valid
    if (!data.email || !data.sub) {
      return null;
    }
    
    // Verify audience - critical security check
    const expectedClientId = process.env.GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (expectedClientId && data.aud !== expectedClientId) {
      console.error('[GOOGLE-AUTH] Audience mismatch. Expected:', expectedClientId, 'Got:', data.aud);
      return null;
    }
    
    return {
      email: data.email,
      name: data.name || data.email.split('@')[0],
      picture: data.picture,
      sub: data.sub,
    };
  } catch (error) {
    console.error('Google token verification error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  await setServiceRoleContext();
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return errorResponse('ID token is required');
    }

    // Verify Google token
    const googleUser = await verifyGoogleToken(idToken);
    if (!googleUser) {
      return errorResponse('Invalid Google token', 401);
    }

    // Check if user exists
    let user = await db.user.findUnique({
      where: { email: googleUser.email },
    });

    if (user) {
      // Update existing user
      user = await db.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          avatarUrl: googleUser.picture || user.avatarUrl,
          authProvider: 'google',
        },
      });
    } else {
      // Create new user
      user = await db.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          role: UserRole.CLIENT,
          status: UserStatus.ACTIVE,
          authProvider: 'google',
        },
      });
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      return errorResponse('Account is not active. Please contact support.', 403);
    }

    // Create a proper session using session-service
    const sessionResult = await createSession({
      userId: user.id,
      deviceName: 'Google Sign-In',
      deviceType: 'web',
    });

    if (!sessionResult.success) {
      console.error('[GOOGLE-AUTH] Failed to create session:', sessionResult.error);
      return serverErrorResponse('Failed to create session');
    }

    // Audit log
    try {
      await createAuditLog({
        action: AuditActions.LOGIN_SUCCESS,
        entityType: EntityTypes.USER,
        entityId: user.id,
        actorType: 'USER',
        userId: user.id,
        description: `Google login: ${user.email}`,
        source: 'MOBILE_APP',
      });
    } catch (auditError) {
      console.error('Google auth audit log failed:', auditError);
    }

    // Standardized response format (matching email/OTP auth endpoints)
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        accessToken: sessionResult.accessToken,
        refreshToken: sessionResult.refreshToken,
        expiresIn: sessionResult.expiresIn,
      },
      message: 'Google login successful',
    });

    // Also set as HTTP-only cookie for web clients
    if (sessionResult.refreshToken) {
      response.cookies.set('refreshToken', sessionResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Google auth error:', error);
    return serverErrorResponse('Failed to authenticate with Google');
  } finally {
    await resetRLSContext();
  }
}
