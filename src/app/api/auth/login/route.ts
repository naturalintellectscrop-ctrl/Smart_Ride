/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 * 
 * SUPPORTS:
 * - Email + Password (legacy)
 * - Phone + OTP (primary method)
 * 
 * SECURITY: Rate limited to 5 attempts per 15 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginUser, loginSchema } from '@/lib/services/auth.service';
import { createSession } from '@/lib/auth/session-service';
import { errorResponse, serverErrorResponse } from '@/lib/api/response';
import { z } from 'zod';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS, getClientIp } from '@/lib/security/rate-limit';
import { securityAudit } from '@/lib/security/audit-log';

// Extended schema to support device info
const loginRequestSchema = loginSchema.extend({
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  deviceType: z.enum(['ios', 'android', 'web']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limiting check
    const rateResult = checkRateLimit(request, RATE_LIMITS.auth.login);
    if (!rateResult.success) {
      return rateLimitResponse(rateResult, RATE_LIMITS.auth.login);
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = loginRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse(validationResult.error.errors[0]?.message || 'Validation error');
    }

    const { email, password, deviceId, deviceName, deviceType } = validationResult.data;

    // Get client info
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Login user (email/password)
    const result = await loginUser({ email, password });

    if (!result.success) {
      // SECURITY: Log failed login attempt
      await securityAudit.log({
        action: 'LOGIN_FAILED',
        entityType: 'user',
        ipAddress,
        userAgent,
        details: { email: email?.substring(0, 3) + '***', reason: result.error },
        success: false,
      });
      
      return errorResponse(result.error || 'Login failed', 401);
    }

    // Create session with device tracking
    const sessionResult = await createSession({
      userId: result.user!.id,
      deviceId,
      deviceName,
      deviceType,
      ipAddress,
      userAgent,
    });

    if (!sessionResult.success) {
      return errorResponse(sessionResult.error || 'Failed to create session');
    }

    // SECURITY: Log successful login
    await securityAudit.log({
      action: 'LOGIN_SUCCESS',
      entityType: 'user',
      entityId: result.user!.id,
      userId: result.user!.id,
      ipAddress,
      userAgent,
      details: { deviceType, deviceName },
      success: true,
    });

    // Return tokens - BOTH accessToken AND refreshToken for mobile
    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        accessToken: sessionResult.accessToken,
        refreshToken: sessionResult.refreshToken, // IMPORTANT: Include for mobile clients
        expiresIn: sessionResult.expiresIn,
      },
      message: 'Login successful',
    });

    // Also set refresh token as HTTP-only cookie for web clients
    if (sessionResult.refreshToken) {
      response.cookies.set('refreshToken', sessionResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(rateResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateResult.reset));

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return serverErrorResponse('Failed to login');
  }
}
