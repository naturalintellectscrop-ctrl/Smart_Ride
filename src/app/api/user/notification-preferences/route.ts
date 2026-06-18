// ============================================
// SMART RIDE - USER NOTIFICATION PREFERENCES API
// ============================================
// PATCH /api/user/notification-preferences
// Persists the global "notificationsEnabled" master toggle
// from the profile screen. Stored as a JSON field on User
// (`notificationPreferences`). Granular per-category toggles
// live in the NotificationPreference model.
// ============================================

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from '@/lib/api/response';
import { z } from 'zod';

const schema = z.object({
  notificationsEnabled: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return unauthorizedResponse('Authentication required');

  const decoded = verifyAccessToken(token);
  if (!decoded) return unauthorizedResponse('Invalid or expired token');

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const validated = schema.parse(body);

    // Merge into any existing JSON prefs so we don't clobber future keys.
    const existing = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { notificationPreferences: true },
    });

    const current =
      (existing?.notificationPreferences as Record<string, unknown> | null) ||
      {};
    const merged = {
      ...current,
      notificationsEnabled: validated.notificationsEnabled,
      updatedAt: new Date().toISOString(),
    };

    await db.user.update({
      where: { id: decoded.userId },
      data: {
        notificationPreferences: merged as any,
      },
    });

    return successResponse(
      { notificationsEnabled: validated.notificationsEnabled },
      'Notification preferences updated'
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || 'Validation error');
    }
    console.error('Error updating notification preferences:', error);
    return serverErrorResponse('Failed to update notification preferences');
  } finally {
    await resetRLSContext();
  }
}

// GET convenience: return the current prefs for the logged-in user
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return unauthorizedResponse('Authentication required');

  const decoded = verifyAccessToken(token);
  if (!decoded) return unauthorizedResponse('Invalid or expired token');

  await setServiceRoleContext();
  try {
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { notificationPreferences: true },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    const prefs =
      (user.notificationPreferences as Record<string, unknown> | null) || {};
    return successResponse({
      notificationsEnabled:
        typeof prefs.notificationsEnabled === 'boolean'
          ? prefs.notificationsEnabled
          : true,
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return serverErrorResponse('Failed to fetch notification preferences');
  } finally {
    await resetRLSContext();
  }
}
