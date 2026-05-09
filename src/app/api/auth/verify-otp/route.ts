/**
 * POST /api/auth/verify-otp
 * Verify OTP and authenticate user (login or register)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateOTP, isPhoneVerified } from '@/lib/auth/otp-service';
import { createSession } from '@/lib/auth/session-service';
import { db } from '@/lib/db';
import { errorResponse, serverErrorResponse } from '@/lib/api/response';
import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';

// Validation schema
const verifyOTPSchema = z.object({
  phone: z.string().min(10, 'Phone number is required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  purpose: z.enum(['login', 'register', 'reset_password', 'verify_phone']),
  
  // For registration
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email').optional(),
  role: z.enum(['CLIENT', 'RIDER', 'MERCHANT']).default('CLIENT').optional(),
  
  // Device info
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  deviceType: z.enum(['ios', 'android', 'web']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = verifyOTPSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse(validationResult.error.errors[0]?.message || 'Validation error');
    }

    const { 
      phone, 
      otp, 
      purpose,
      name,
      email,
      role,
      deviceId,
      deviceName,
      deviceType 
    } = validationResult.data;

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Validate OTP
    const otpResult = await validateOTP(phone, otp, purpose);

    if (!otpResult.success) {
      return errorResponse(otpResult.error || 'Invalid OTP');
    }

    // Normalize phone
    const normalizedPhone = phone.startsWith('0') 
      ? '+256' + phone.substring(1) 
      : phone.startsWith('+') ? phone : '+' + phone;

    let user;

    if (purpose === 'register') {
      // Check if user already exists
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            ...(email ? [{ email }] : []),
          ],
        },
      });

      if (existingUser) {
        return errorResponse('User already exists with this phone or email');
      }

      // Validate required fields for registration
      if (!name) {
        return errorResponse('Name is required for registration');
      }

      // Create new user
      user = await db.user.create({
        data: {
          name,
          phone: normalizedPhone,
          email: email || `${normalizedPhone.replace('+', '')}@temp.smartride.ug`,
          role: (role || 'CLIENT') as UserRole,
          status: UserStatus.ACTIVE,
          authProvider: 'phone_otp',
        },
      });

      console.log(`[VERIFY-OTP] Created new user: ${user.id}`);
    } else {
      // Login - find existing user
      user = await db.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (!user) {
        return errorResponse('No account found with this phone number. Please register first.');
      }

      if (user.status !== UserStatus.ACTIVE) {
        return errorResponse('Account is not active. Please contact support.');
      }
    }

    // Create session
    const sessionResult = await createSession({
      userId: user.id,
      deviceId,
      deviceName,
      deviceType,
      ipAddress,
      userAgent,
    });

    if (!sessionResult.success) {
      return errorResponse(sessionResult.error || 'Failed to create session');
    }

    // Return tokens
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        accessToken: sessionResult.accessToken,
        refreshToken: sessionResult.refreshToken,
        expiresIn: sessionResult.expiresIn,
      },
      message: purpose === 'register' ? 'Registration successful' : 'Login successful',
    });
  } catch (error) {
    console.error('[VERIFY-OTP] Error:', error);
    return serverErrorResponse('Failed to verify OTP');
  }
}
