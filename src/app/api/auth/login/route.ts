/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginUser, loginSchema } from '@/lib/services/auth.service';
import { errorResponse, serverErrorResponse } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse(validationResult.error.errors[0]?.message || 'Validation error');
    }

    // Login user
    const result = await loginUser(validationResult.data);

    if (!result.success) {
      return errorResponse(result.error || 'Login failed', 401);
    }

    // Set refresh token as HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens?.accessToken,
        expiresIn: result.tokens?.expiresIn,
      },
      message: 'Login successful',
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
    console.error('Login error:', error);
    return serverErrorResponse('Failed to login');
  }
}
