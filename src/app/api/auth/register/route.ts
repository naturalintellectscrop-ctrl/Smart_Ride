/**
 * POST /api/auth/register
 * Register a new user
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerUser, registerSchema } from '@/lib/services/auth.service';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse(validationResult.error.errors[0]?.message || 'Validation error');
    }

    // Register user
    const result = await registerUser(validationResult.data);

    if (!result.success) {
      return errorResponse(result.error || 'Registration failed');
    }

    // Create audit log for user registration
    try {
      await createAuditLog({
        action: AuditActions.USER_REGISTERED,
        entityType: EntityTypes.USER,
        entityId: result.user?.id || '',
        actorType: 'USER',
        userId: result.user?.id,
        description: `User registered: ${result.user?.phone || result.user?.email || 'unknown'}`,
        source: 'MOBILE_APP',
      });
    } catch (auditError) {
      console.error('Audit log failed for user registration:', auditError);
    }

    // Set refresh token as HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens?.accessToken,
        expiresIn: result.tokens?.expiresIn,
      },
      message: 'Registration successful',
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
    console.error('Registration error:', error);
    return serverErrorResponse('Failed to register user');
  }
}
