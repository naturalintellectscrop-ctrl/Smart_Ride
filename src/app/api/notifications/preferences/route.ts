import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';
import { setRLSContext, resetRLSContext } from '@/lib/db';
import {
  getNotificationPreferences,
  updateNotificationPreferences
} from '@/lib/services/notification.service';

/**
 * GET /api/notifications/preferences
 * Get notification preferences for the authenticated user
 * Auth-protected: userId is derived from the authenticated user's token
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.userId as string;
    await setRLSContext(user);
    try {
      const preferences = await getNotificationPreferences(userId);
      return NextResponse.json({ success: true, preferences });
    } finally {
      await resetRLSContext();
    }
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch notification preferences' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications/preferences
 * Update notification preferences for the authenticated user
 * Auth-protected: userId is derived from the authenticated user's token
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.userId as string;
    const preferences = await request.json();

    await setRLSContext(user);
    try {
      const updatedPrefs = await updateNotificationPreferences(userId, preferences);
      return NextResponse.json({ success: true, preferences: updatedPrefs });
    } finally {
      await resetRLSContext();
    }
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json({ error: 'Failed to update notification preferences' }, { status: 500 });
  }
}
