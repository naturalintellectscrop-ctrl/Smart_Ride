/**
 * POST /api/auth/forgot-password
 * General user forgot password - sends reset link via email
 * Works for ALL user roles (not just admins)
 * 
 * Security: Always returns success to prevent email enumeration
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateResetToken } from '@/lib/auth/password';
import { sendEmail, generatePasswordResetEmail } from '@/lib/email';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = forgotPasswordSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Find user by email (ALL user roles)
    const user = await db.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.passwordHash) {
      // Log attempt for security monitoring
      console.log(`Forgot password attempt for unrecognized email: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in database
    await db.passwordResetToken.create({
      data: {
        email,
        token: resetToken,
        expiresAt,
      },
    });

    // Generate reset URL (for mobile deep link / web page)
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://smartrideug.vercel.app'}/reset-password`;

    // Send email
    const emailTemplate = generatePasswordResetEmail(resetToken, resetUrl);
    const emailResult = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    // In development mode (no RESEND_API_KEY), log the reset link
    if (!process.env.RESEND_API_KEY) {
      console.log(`🔗 PASSWORD RESET LINK (dev mode): ${resetUrl}?token=${resetToken}`);
      console.log(`   Email: ${email}, Token expires in 1 hour`);
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'USER',
        entityId: user.id,
        userId: user.id,
        description: `Password reset requested for user ${user.email}`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
      // In dev mode without RESEND_API_KEY, include the token for testing
      ...(process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY ? { devToken: resetToken } : {}),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    // Still return success to prevent info leakage
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  }
}
