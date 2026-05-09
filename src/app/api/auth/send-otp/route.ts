/**
 * POST /api/auth/send-otp
 * Send OTP to phone number for authentication
 * SECURITY: OTP is only returned in development mode, never in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendOTP } from '@/lib/auth/otp-service';
import { errorResponse, serverErrorResponse } from '@/lib/api/response';
import { z } from 'zod';

// Validation schema
const sendOTPSchema = z.object({
  phone: z.string().min(10, 'Phone number is required'),
  purpose: z.enum(['login', 'register', 'reset_password', 'verify_phone']).default('login'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = sendOTPSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse(validationResult.error.errors[0]?.message || 'Validation error');
    }

    const { phone, purpose } = validationResult.data;
    
    // Get client IP for rate limiting
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';

    // Send OTP
    const result = await sendOTP(phone, purpose, ipAddress);

    if (!result.success) {
      return errorResponse(result.error || 'Failed to send OTP');
    }

    // SECURITY: Never expose OTP in production
    // Only return OTP in development mode for testing purposes
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const allowOtpInResponse = isDevelopment && process.env.ALLOW_OTP_IN_RESPONSE === 'true';
    
    const responseData: Record<string, unknown> = {
      success: true,
      message: 'OTP sent successfully',
      expiresIn: result.expiresIn,
    };

    // Only include OTP in response for development testing
    if (allowOtpInResponse && result.otp) {
      responseData.otp = result.otp;
      responseData._warning = 'OTP included for development testing only. Never use in production!';
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[SEND-OTP] Error:', error);
    return serverErrorResponse('Failed to send OTP');
  }
}
