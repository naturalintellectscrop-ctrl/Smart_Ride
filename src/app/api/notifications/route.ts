import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/middleware';
import { Prisma, NotificationType } from '@prisma/client';

/**
 * GET /api/notifications
 * Get user's notification history
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await setRLSContext(user);
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const unreadOnly = searchParams.get('unreadOnly') === 'true';

      const where: Prisma.NotificationWhereInput = { userId: user.userId };
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
    } finally {
      await resetRLSContext();
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Send a notification to a user
 * Auth-protected: requires authentication. Backend services should use
 * createNotification() from notification.service.ts directly.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, title, message, type, referenceId, referenceType } = body;

    if (!userId || !title || !message || !type) {
      return NextResponse.json({ success: false, error: 'Missing required fields: userId, title, message, type' },
        { status: 400 }
      );
    }

    await setRLSContext(user);
    try {
      // Create notification in database
      const notification = await db.notification.create({
        data: {
          userId,
          title,
          message,
          type: type as NotificationType,
          referenceId,
          referenceType,
        },
      });

      return NextResponse.json({ success: true, notification });
    } finally {
      await resetRLSContext();
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllAsRead } = body;

    await setRLSContext(user);
    try {
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
        return NextResponse.json({ success: false, error: 'Missing notificationId or markAllAsRead' },
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
    } finally {
      await resetRLSContext();
    }
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ success: false, error: 'Failed to update notification' }, { status: 500 });
  }
}
