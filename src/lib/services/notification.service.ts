/**
 * Notification Service
 * Handles all notification types: push, in-app, SMS
 */

import { db } from '@/lib/db';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: string;
  data?: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  notification?: unknown;
  error?: string;
}

/**
 * Create an in-app notification
 */
export async function createNotification(input: CreateNotificationInput): Promise<NotificationResult> {
  try {
    const notification = await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type as NotificationType,
        title: input.title,
        message: input.message,
        referenceId: input.referenceId || null,
        referenceType: input.referenceType || null,
      },
    });

    // Emit real-time notification via Socket.io
    await emitNotification(input.userId, {
      id: notification.id,
      type: input.type,
      title: input.title,
      message: input.message,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      createdAt: notification.createdAt,
    });

    return { success: true, notification };
  } catch (error) {
    console.error('Create notification error:', error);
    return { success: false, error: 'Failed to create notification' };
  }
}

/**
 * Create multiple notifications at once
 */
export async function createNotifications(
  inputs: CreateNotificationInput[]
): Promise<NotificationResult> {
  try {
    await db.notification.createMany({
      data: inputs.map(input => ({
        userId: input.userId,
        type: input.type as NotificationType,
        title: input.title,
        message: input.message,
        referenceId: input.referenceId || null,
        referenceType: input.referenceType || null,
      })),
    });

    // Emit notifications
    for (const input of inputs) {
      await emitNotification(input.userId, {
        type: input.type,
        title: input.title,
        message: input.message,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Create notifications error:', error);
    return { success: false, error: 'Failed to create notifications' };
  }
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  try {
    const { unreadOnly = false, limit = 20, offset = 0 } = options;

    const where = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    const [notifications, unreadCount, totalCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.notification.count({
        where: { userId, isRead: false },
      }),
      db.notification.count({ where }),
    ]);

    return {
      success: true,
      notifications,
      unreadCount,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  } catch (error) {
    console.error('Get notifications error:', error);
    return {
      success: false,
      notifications: [],
      unreadCount: 0,
      totalCount: 0,
      hasMore: false,
    };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<NotificationResult> {
  try {
    const notification = await db.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user owns this notification
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    if (notification.count === 0) {
      return { success: false, error: 'Notification not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Mark notification read error:', error);
    return { success: false, error: 'Failed to mark notification as read' };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<NotificationResult> {
  try {
    await db.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return { success: false, error: 'Failed to mark all notifications as read' };
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<NotificationResult> {
  try {
    const result = await db.notification.deleteMany({
      where: {
        id: notificationId,
        userId, // Ensure user owns this notification
      },
    });

    if (result.count === 0) {
      return { success: false, error: 'Notification not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete notification error:', error);
    return { success: false, error: 'Failed to delete notification' };
  }
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

/**
 * Send task status update notification
 */
export async function sendTaskUpdateNotification(
  userId: string,
  taskId: string,
  taskNumber: string,
  status: string
): Promise<NotificationResult> {
  const templates: Record<string, { title: string; message: string }> = {
    ASSIGNED: {
      title: 'Rider Assigned',
      message: 'A rider has been assigned to your request.',
    },
    ACCEPTED: {
      title: 'Rider On The Way',
      message: 'Your rider has accepted and is heading to you.',
    },
    ARRIVED: {
      title: 'Rider Arrived',
      message: 'Your rider has arrived at the pickup location.',
    },
    IN_TRANSIT: {
      title: 'On The Way',
      message: 'Your delivery is on its way to the destination.',
    },
    COMPLETED: {
      title: 'Task Completed',
      message: 'Your task has been completed successfully.',
    },
    CANCELLED: {
      title: 'Task Cancelled',
      message: 'Your task has been cancelled.',
    },
  };

  const template = templates[status] || {
    title: 'Task Update',
    message: `Your task status has been updated to: ${status}`,
  };

  return createNotification({
    userId,
    type: 'TASK_UPDATE',
    title: template.title,
    message: template.message,
    referenceId: taskId,
    referenceType: 'TASK',
    data: { taskNumber, status },
  });
}

/**
 * Send order status update notification
 */
export async function sendOrderUpdateNotification(
  userId: string,
  orderId: string,
  orderNumber: string,
  status: string
): Promise<NotificationResult> {
  const templates: Record<string, { title: string; message: string }> = {
    PAYMENT_CONFIRMED: {
      title: 'Order Confirmed',
      message: 'Your order has been confirmed and is being processed.',
    },
    MERCHANT_ACCEPTED: {
      title: 'Order Accepted',
      message: 'The merchant has accepted your order.',
    },
    PREPARING: {
      title: 'Order Preparing',
      message: 'Your order is being prepared.',
    },
    READY_FOR_PICKUP: {
      title: 'Order Ready',
      message: 'Your order is ready for pickup. A rider is on the way.',
    },
    DELIVERED: {
      title: 'Order Delivered',
      message: 'Your order has been delivered. Enjoy!',
    },
    CANCELLED: {
      title: 'Order Cancelled',
      message: 'Your order has been cancelled.',
    },
  };

  const template = templates[status] || {
    title: 'Order Update',
    message: `Your order status has been updated to: ${status}`,
  };

  return createNotification({
    userId,
    type: 'ORDER_UPDATE',
    title: template.title,
    message: template.message,
    referenceId: orderId,
    referenceType: 'ORDER',
    data: { orderNumber, status },
  });
}

/**
 * Send payment notification
 */
export async function sendPaymentNotification(
  userId: string,
  paymentId: string,
  amount: number,
  status: string
): Promise<NotificationResult> {
  const templates: Record<string, { title: string; message: string }> = {
    COMPLETED: {
      title: 'Payment Successful',
      message: `Your payment of UGX ${amount.toLocaleString()} has been processed successfully.`,
    },
    FAILED: {
      title: 'Payment Failed',
      message: `Your payment of UGX ${amount.toLocaleString()} could not be processed. Please try again.`,
    },
    REFUNDED: {
      title: 'Refund Processed',
      message: `Your refund of UGX ${amount.toLocaleString()} has been processed.`,
    },
  };

  const template = templates[status] || {
    title: 'Payment Update',
    message: `Your payment status has been updated to: ${status}`,
  };

  return createNotification({
    userId,
    type: 'PAYMENT',
    title: template.title,
    message: template.message,
    referenceId: paymentId,
    referenceType: 'PAYMENT',
    data: { amount, status },
  });
}

/**
 * Send SOS alert notification to admins
 */
export async function sendSOSAlertNotification(
  alertId: string,
  alertData: {
    userName: string;
    userType: string;
    latitude: number;
    longitude: number;
    taskNumber?: string;
  }
): Promise<NotificationResult> {
  // Get all admin users
  const admins = await db.user.findMany({
    where: {
      role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'] },
      status: 'ACTIVE',
    },
    select: { id: true },
  });

  if (admins.length === 0) {
    return { success: false, error: 'No active admins found' };
  }

  // Create notifications for all admins
  await createNotifications(
    admins.map(admin => ({
      userId: admin.id,
      type: 'SOS_ALERT',
      title: '🚨 SOS Emergency Alert',
      message: `${alertData.userName} (${alertData.userType}) has triggered an SOS alert!${
        alertData.taskNumber ? ` Task: ${alertData.taskNumber}` : ''
      }`,
      referenceId: alertId,
      referenceType: 'SOS_ALERT',
      data: alertData,
    }))
  );

  return { success: true };
}

// ============================================
// REAL-TIME NOTIFICATION EMITTER
// ============================================

/**
 * Emit notification via Socket.io
 * This function interfaces with the Socket.io mini-service
 */
async function emitNotification(userId: string, data: unknown): Promise<void> {
  try {
    // In production, this would emit via Socket.io
    // For now, we'll use fetch to the mini-service
    const socketPort = process.env.SOCKET_PORT || '3001';
    const response = await fetch(`http://localhost:${socketPort}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': process.env.JWT_SECRET || 'internal',
      },
      body: JSON.stringify({
        room: `user:${userId}`,
        event: 'notification',
        data,
      }),
    });

    if (!response.ok) {
      console.error('Failed to emit notification via Socket.io');
    }
  } catch (error) {
    // Socket.io service might not be running
    console.log('Socket.io emission skipped (service not available)');
  }
}
