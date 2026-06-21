/**
 * POST /api/admin/force-reset-password
 *
 * Admin tool to directly reset ANY user's password without requiring an
 * email reset link. Useful when:
 *   - Email service (Resend) is not configured yet
 *   - A user is locked out and can't receive reset emails
 *   - Admin needs to urgently restore access to an account
 *
 * SECURITY:
 *   - Requires the ADMIN_SETUP_KEY env var to be set AND the request to
 *     supply a matching `key` in the request body.
 *   - This is the same key used by /api/admin/setup.
 *   - All actions are recorded in the audit log.
 *
 * USAGE:
 *   curl -X POST https://smartrideug.vercel.app/api/admin/force-reset-password \
 *     -H "Content-Type: application/json" \
 *     -d '{"key":"YOUR_ADMIN_SETUP_KEY","email":"user@example.com","newPassword":"NewPass123!"}'
 *
 * The new password must meet strength requirements:
 *   - At least 8 characters
 *   - At least one uppercase letter
 *   - At least one lowercase letter
 *   - At least one number
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { z } from 'zod';

const forceResetSchema = z.object({
  key: z.string().min(1, 'Admin key is required'),
  email: z.string().email('Valid email is required'),
  newPassword: z.string().min(1, 'New password is required'),
});

export async function POST(request: NextRequest) {
  await setServiceRoleContext();
  try {
    const body = await request.json();
    const validationResult = forceResetSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { key, email, newPassword } = validationResult.data;

    // Verify admin key
    const requiredKey = process.env.ADMIN_SETUP_KEY;
    if (!requiredKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Admin force-reset is not configured. Set ADMIN_SETUP_KEY in Vercel → Settings → Environment Variables.',
        },
        { status: 500 }
      );
    }

    if (key !== requiredKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: invalid admin key.' },
        { status: 401 }
      );
    }

    // Validate password strength
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return NextResponse.json(
        { success: false, error: passwordError },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: `No user found with email: ${email}` },
        { status: 404 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This account does not use a password (it may be a Google/Apple-only account). Password reset is not applicable.',
        },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password and invalidate all existing sessions
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });

    // Clean up any pending password reset tokens for this email
    await db.passwordResetToken.deleteMany({
      where: { email: user.email },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'ADMIN',
        action: 'ADMIN_FORCE_PASSWORD_RESET',
        entityType: 'USER',
        entityId: user.id,
        userId: user.id,
        description: `Admin force-reset password for user ${user.email}`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${user.email}. The user can now log in with the new password. All previous sessions have been invalidated.`,
    });
  } catch (error) {
    console.error('Force reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
