/**
 * POST /api/auth/google
 * Authenticate user with Google ID token
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateTokenPair } from '@/lib/auth/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import { errorResponse, serverErrorResponse } from '@/lib/api/response';

interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
  sub: string; // Google user ID
}

async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo | null> {
  try {
    // Verify with Google's API
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

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Update user with refresh token
    await db.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Set refresh token as HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
      message: 'Google login successful',
    });

    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google auth error:', error);
    return serverErrorResponse('Failed to authenticate with Google');
  }
}
