import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/middleware';

/**
 * GET /api/notifications
 * Get user's notification history
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const where: any = { userId: user.userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.notification.count({ where }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Send a notification to a user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, message, type, referenceId, referenceType, data } = body;

    if (!userId || !title || !message || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, message, type' },
        { status: 400 }
      );
    }

    // Create notification in database
    const notification = await db.notification.create({
      data: {
        userId,
        title,
        message,
        type: type as any,
        referenceId,
        referenceType,
      },
    });

    // In production, this would also send via FCM
    // For now, we just store it in the database

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      await db.notification.updateMany({
        where: {
          userId: user.userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Missing notificationId or markAllAsRead' },
        { status: 400 }
      );
    }

    await db.notification.update({
      where: {
        id: notificationId,
        userId: user.userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
