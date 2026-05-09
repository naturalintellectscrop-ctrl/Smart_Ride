import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { hash, compare } from 'bcryptjs';
import { z } from 'zod';

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    return new TextEncoder().encode('dev-secret-key-not-for-production');
  }
  return new TextEncoder().encode(secret);
};

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('admin-session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify token
    const { payload } = await jwtVerify(token, getSecretKey());
    const userId = payload.userId as string;

    // Validate request body
    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    // Get user with password hash
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const passwordValid = await compare(currentPassword, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash new password
    const newPasswordHash = await hash(newPassword, 10);

    // Update password
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'ADMIN',
        userId,
        action: 'PASSWORD_CHANGED',
        entityType: 'User',
        entityId: userId,
        description: `Admin changed their own password: ${user.email}`,
      },
    });

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
