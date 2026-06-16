import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/api/response';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return unauthorizedResponse('Authentication required');

  const decoded = verifyAccessToken(token);
  if (!decoded) return unauthorizedResponse('Invalid or expired token');

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const validated = schema.parse(body);

    // Get user with password hash
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, password: true },
    });

    if (!user || !user.password) {
      return errorResponse('User not found or no password set', 404);
    }

    // Verify current password
    const isValid = await bcrypt.compare(validated.currentPassword, user.password);
    if (!isValid) {
      return errorResponse('Current password is incorrect', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validated.newPassword, 12);

    // Update password
    await db.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword },
    });

    return successResponse(null, 'Password changed successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || 'Validation error');
    }
    console.error('Error changing password:', error);
    return serverErrorResponse('Failed to change password');
  } finally {
    await resetRLSContext();
  }
}
