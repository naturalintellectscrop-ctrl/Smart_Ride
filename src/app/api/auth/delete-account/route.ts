import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/api/response';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const schema = z.object({
  password: z.string().min(1, 'Password is required'),
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

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, passwordHash: true, email: true },
    });

    if (!user || !user.passwordHash) {
      return errorResponse('User not found', 404);
    }

    // Verify password
    const isValid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isValid) {
      return errorResponse('Incorrect password', 400);
    }

    // Soft delete: anonymize user data and mark as deleted
    await db.user.update({
      where: { id: decoded.userId },
      data: {
        email: `deleted-${decoded.userId}@deleted.local`,
        name: 'Deleted User',
        phone: null,
        avatarUrl: null,
        appleUserId: null,
        status: 'DELETED',
        // Clear sensitive fields
        refreshToken: null,
        refreshTokenExpiresAt: null,
        passwordHash: null,
      },
    });

    // Delete related session data (revokes all active sessions)
    await db.session.deleteMany({
      where: { userId: decoded.userId },
    });

    // Unregister push tokens
    await db.expoPushToken.deleteMany({
      where: { userId: decoded.userId },
    });

    return successResponse(null, 'Account deleted successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || 'Validation error');
    }
    console.error('Error deleting account:', error);
    return serverErrorResponse('Failed to delete account');
  } finally {
    await resetRLSContext();
  }
}
