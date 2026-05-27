import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/services/notification.service';

/**
 * POST /api/notifications/read
 * Mark notification(s) as read
 * Auth-protected: userId is derived from the authenticated user's token
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = user.userId as string;

    // Mark all as read
    if (body.markAll) {
      const result = await markAllNotificationsAsRead(userId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    // Mark single notification as read
    const { notificationId } = body;
    if (!notificationId) {
      return NextResponse.json(
        { error: 'Missing notificationId or markAll' },
        { status: 400 }
      );
    }

    const result = await markNotificationAsRead(notificationId, userId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}
