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
    SEARCHING: {
      title: 'Searching for Rider',
      message: 'We are searching for available riders near you. Please wait a moment.',
    },
    MATCHING: {
      title: 'Matching in Progress',
      message: 'We are matching you with the best available rider.',
    },
    ASSIGNED: {
      title: 'Rider Assigned',
      message: 'A rider has been assigned to your request.',
    },
    REASSIGNED: {
      title: 'Rider Reassigned',
      message: 'Your previous rider was unavailable. A new rider is being assigned to your request.',
    },
    ACCEPTED: {
      title: 'Rider On The Way',
      message: 'Your rider has accepted and is heading to you.',
    },
    ARRIVING: {
      title: 'Rider Approaching',
      message: 'Your rider is approaching the pickup location.',
    },
    ARRIVED: {
      title: 'Rider Arrived',
      message: 'Your rider has arrived at the pickup location.',
    },
    PICKED_UP: {
      title: 'Picked Up',
      message: 'Your item has been picked up and the ride is ready to go.',
    },
    IN_PROGRESS: {
      title: 'Trip Started',
      message: 'Your trip has started. Sit back and enjoy the ride!',
    },
    IN_TRANSIT: {
      title: 'On The Way',
      message: 'Your delivery is on its way to the destination.',
    },
    DELIVERED: {
      title: 'Delivered',
      message: 'Your delivery has been dropped off at the destination.',
    },
    COMPLETED: {
      title: 'Task Completed',
      message: 'Your task has been completed successfully.',
    },
    CANCELLED: {
      title: 'Task Cancelled',
      message: 'Your task has been cancelled.',
    },
    FAILED: {
      title: 'Task Failed',
      message: 'Your task could not be completed. Please try again or contact support.',
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
    PICKED_UP: {
      title: 'Order Picked Up',
      message: 'Your order has been picked up by the rider and is on its way!',
    },
    RIDER_ASSIGNED: {
      title: 'Rider Assigned',
      message: 'A rider has been assigned to your order.',
    },
    IN_TRANSIT: {
      title: 'Order In Transit',
      message: 'Your order is on its way to you.',
    },
    DELIVERED: {
      title: 'Order Delivered',
      message: 'Your order has been delivered. Enjoy!',
    },
    CANCELLED: {
      title: 'Order Cancelled',
      message: 'Your order has been cancelled.',
    },
    REJECTED: {
      title: 'Order Rejected',
      message: 'The merchant has rejected your order. A refund will be processed if applicable.',
    },
    REFUNDED: {
      title: 'Refund Processed',
      message: 'A refund for your order has been processed.',
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
// DISPATCH NOTIFICATION HELPERS
// ============================================

/**
 * Send a REASSIGNED notification to the client when a dispatch match expires
 * and a new rider is being searched for.
 * Also sends a real-time socket event via the dispatch service.
 */
export async function sendDispatchReassignedNotification(
  clientId: string,
  taskId: string,
  taskNumber: string,
  reason: string
): Promise<NotificationResult> {
  return createNotification({
    userId: clientId,
    type: 'TASK_UPDATE',
    title: 'Rider Reassigned',
    message: reason || 'Your previous rider was unavailable. A new rider is being assigned to your request.',
    referenceId: taskId,
    referenceType: 'TASK',
    data: { taskNumber, status: 'REASSIGNED', reason },
  });
}

/**
 * Send a SEARCHING notification to the client when no riders are available
 * and the system is actively searching for one.
 */
export async function sendSearchingNotification(
  clientId: string,
  taskId: string,
  taskNumber: string
): Promise<NotificationResult> {
  return sendTaskUpdateNotification(clientId, taskId, taskNumber, 'SEARCHING');
}

/**
 * Send a DELIVERED notification to the client when a delivery has been completed.
 * This is a key lifecycle event for delivery tasks (FOOD_DELIVERY, SHOPPING, ITEM_DELIVERY, HEALTH_DELIVERY).
 */
export async function sendDeliveredNotification(
  clientId: string,
  taskId: string,
  taskNumber: string
): Promise<NotificationResult> {
  return sendTaskUpdateNotification(clientId, taskId, taskNumber, 'DELIVERED');
}

// ============================================
// MULTI-USER NOTIFICATION HELPER
// ============================================

/**
 * Create notifications for multiple users (convenience wrapper)
 */
export async function createNotificationsForUsers(
  userIds: string[],
  notification: Omit<CreateNotificationInput, 'userId'>
) {
  const notifications = await db.notification.createMany({
    data: userIds.map(userId => ({
      userId,
      title: notification.title,
      message: notification.message,
      type: notification.type as NotificationType,
      referenceId: notification.referenceId || null,
      referenceType: notification.referenceType || null,
    })),
  });

  // Emit real-time notifications for each user
  for (const userId of userIds) {
    await emitNotification(userId, {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      referenceId: notification.referenceId,
      referenceType: notification.referenceType,
    });
  }

  return notifications;
}

// ============================================
// BROADCAST TYPES & FUNCTIONS
// ============================================

export type BroadcastTypeInput =
  | 'SURGE_ACTIVATION'
  | 'SURGE_DEACTIVATION'
  | 'INCENTIVE_CREATED'
  | 'HIGH_DEMAND_ALERT'
  | 'PROMOTION_CREATED'
  | 'EARNINGS_OPPORTUNITY'
  | 'DRIVER_REQUEST';

export type TargetAudienceInput =
  | 'RIDERS'
  | 'CLIENTS'
  | 'ALL'
  | 'ALL_ONLINE_RIDERS'
  | 'ZONE_RIDERS'
  | 'ZONE_CLIENTS';

export interface BroadcastInput {
  zoneId?: string;
  broadcastType: BroadcastTypeInput;
  title: string;
  message: string;
  targetAudience: TargetAudienceInput;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, unknown>;
  expiresInMinutes?: number;
}

/**
 * Broadcast notification to target audience
 */
export async function broadcastNotification(input: BroadcastInput) {
  // Create broadcast record
  const broadcast = await db.notificationBroadcast.create({
    data: {
      zoneId: input.zoneId || null,
      broadcastType: input.broadcastType,
      title: input.title,
      message: input.message,
      targetAudience: input.targetAudience,
      referenceId: input.referenceId || null,
      referenceType: input.referenceType || null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      expiresAt: input.expiresInMinutes
        ? new Date(Date.now() + input.expiresInMinutes * 60 * 1000)
        : null,
      status: 'PENDING',
    },
  });

  // Get target user IDs based on audience
  const userIds = await getTargetUserIds(input.targetAudience, input.zoneId);

  if (userIds.length === 0) {
    await db.notificationBroadcast.update({
      where: { id: broadcast.id },
      data: { status: 'FAILED', recipientsCount: 0 },
    });
    return { broadcast, notifications: [], recipientCount: 0 };
  }

  // Determine notification type based on broadcast type
  const notificationType = getNotificationTypeForBroadcast(input.broadcastType, input.targetAudience);

  // Create notifications for all target users
  await db.notification.createMany({
    data: userIds.map(userId => ({
      userId,
      title: input.title,
      message: input.message,
      type: notificationType,
      referenceId: input.referenceId || null,
      referenceType: input.referenceType || null,
    })),
  });

  // Emit real-time notifications
  for (const userId of userIds) {
    await emitNotification(userId, {
      type: notificationType,
      title: input.title,
      message: input.message,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
    });
  }

  // Update broadcast status
  const updatedBroadcast = await db.notificationBroadcast.update({
    where: { id: broadcast.id },
    data: {
      status: 'SENT',
      sentAt: new Date(),
      recipientsCount: userIds.length,
      deliveredCount: userIds.length,
    },
  });

  return {
    broadcast: updatedBroadcast,
    recipientCount: userIds.length,
  };
}

/**
 * Get target user IDs based on audience type
 */
async function getTargetUserIds(
  targetAudience: TargetAudienceInput,
  zoneId?: string
): Promise<string[]> {
  switch (targetAudience) {
    case 'ALL_ONLINE_RIDERS': {
      const onlineRiders = await db.rider.findMany({
        where: {
          isOnline: true,
          status: 'APPROVED',
        },
        select: { userId: true },
      });
      return onlineRiders.map(r => r.userId).filter(Boolean) as string[];
    }

    case 'RIDERS': {
      const allRiders = await db.rider.findMany({
        where: { status: 'APPROVED' },
        select: { userId: true },
      });
      return allRiders.map(r => r.userId).filter(Boolean) as string[];
    }

    case 'CLIENTS': {
      const clients = await db.user.findMany({
        where: { role: 'CLIENT', status: 'ACTIVE' },
        select: { id: true },
      });
      return clients.map(c => c.id);
    }

    case 'ALL': {
      const allUsers = await db.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });
      return allUsers.map(u => u.id);
    }

    case 'ZONE_RIDERS': {
      if (!zoneId) return [];
      const zone = await db.geographicZone.findUnique({
        where: { id: zoneId },
      });
      if (!zone) return [];

      const zoneRiders = await db.rider.findMany({
        where: {
          status: 'APPROVED',
          isOnline: true,
          currentLatitude: { not: null },
          currentLongitude: { not: null },
        },
        select: {
          userId: true,
          currentLatitude: true,
          currentLongitude: true,
        },
      });

      const radiusKm = zone.radiusKm || 5;
      const latDiff = radiusKm / 111;
      const lngDiff = radiusKm / (111 * Math.cos(zone.centerLatitude * Math.PI / 180));

      const nearbyRiders = zoneRiders.filter(r => {
        if (!r.currentLatitude || !r.currentLongitude) return false;
        const latMatch = Math.abs(r.currentLatitude - zone.centerLatitude) <= latDiff;
        const lngMatch = Math.abs(r.currentLongitude - zone.centerLongitude) <= lngDiff;
        return latMatch && lngMatch;
      });

      return nearbyRiders.map(r => r.userId).filter(Boolean) as string[];
    }

    case 'ZONE_CLIENTS': {
      if (!zoneId) return [];
      const zoneClients = await db.user.findMany({
        where: { role: 'CLIENT', status: 'ACTIVE' },
        select: { id: true },
      });
      return zoneClients.map(c => c.id);
    }

    default:
      return [];
  }
}

/**
 * Map broadcast type to notification type
 */
function getNotificationTypeForBroadcast(
  broadcastType: BroadcastTypeInput,
  targetAudience: TargetAudienceInput
): NotificationType {
  if (targetAudience === 'CLIENTS' || targetAudience === 'ZONE_CLIENTS' || targetAudience === 'ALL') {
    switch (broadcastType) {
      case 'SURGE_ACTIVATION':
        return 'SURGE_WARNING';
      case 'PROMOTION_CREATED':
        return 'PROMO_AVAILABLE';
      default:
        return 'PROMOTION';
    }
  }

  switch (broadcastType) {
    case 'SURGE_ACTIVATION':
      return 'SURGE_ALERT';
    case 'HIGH_DEMAND_ALERT':
      return 'HIGH_DEMAND_ZONE';
    case 'INCENTIVE_CREATED':
      return 'INCENTIVE_AVAILABLE';
    case 'EARNINGS_OPPORTUNITY':
      return 'EARNINGS_OPPORTUNITY';
    case 'DRIVER_REQUEST':
      return 'DRIVER_REPOSITION';
    default:
      return 'SYSTEM';
  }
}

// ============================================
// MARKETPLACE BALANCE NOTIFICATIONS
// ============================================

/**
 * Send surge activation notification to riders
 */
export async function notifySurgeActivation(
  zoneId: string,
  zoneName: string,
  multiplier: number,
  reason?: string
) {
  const result = await broadcastNotification({
    zoneId,
    broadcastType: 'SURGE_ACTIVATION',
    title: `⚡ Surge ${multiplier.toFixed(1)}x Active!`,
    message: `Surge pricing is now active in ${zoneName}. ${reason || 'High demand in this area.'} Move there for higher earnings!`,
    targetAudience: 'ALL_ONLINE_RIDERS',
    referenceId: zoneId,
    referenceType: 'SURGE',
    metadata: { multiplier, zoneName, reason },
    expiresInMinutes: 60,
  });

  return result;
}

/**
 * Send high demand alert to riders
 */
export async function notifyHighDemand(
  zoneId: string,
  zoneName: string,
  ratio: number,
  rideRequests: number
) {
  const result = await broadcastNotification({
    zoneId,
    broadcastType: 'HIGH_DEMAND_ALERT',
    title: `🔥 High Demand in ${zoneName}`,
    message: `${rideRequests} riders waiting! Demand-supply ratio: ${ratio.toFixed(2)}. Great earning opportunity!`,
    targetAudience: 'ALL_ONLINE_RIDERS',
    referenceId: zoneId,
    referenceType: 'ZONE',
    metadata: { ratio, rideRequests, zoneName },
    expiresInMinutes: 30,
  });

  return result;
}

/**
 * Send new incentive notification to riders
 */
export async function notifyNewIncentive(
  incentiveId: string,
  incentiveName: string,
  rewardAmount: number,
  zoneName?: string,
  minRides?: number
) {
  const zoneText = zoneName ? ` in ${zoneName}` : '';
  const ridesText = minRides ? ` Complete ${minRides} rides to qualify.` : '';

  const result = await broadcastNotification({
    broadcastType: 'INCENTIVE_CREATED',
    title: `🎁 New Incentive Available!`,
    message: `${incentiveName}${zoneText}. Earn ${formatCurrency(rewardAmount)} bonus!${ridesText}`,
    targetAudience: 'RIDERS',
    referenceId: incentiveId,
    referenceType: 'INCENTIVE',
    metadata: { incentiveId, incentiveName, rewardAmount, zoneName, minRides },
    expiresInMinutes: 240,
  });

  return result;
}

/**
 * Send earnings opportunity notification
 */
export async function notifyEarningsOpportunity(
  zoneId: string,
  zoneName: string,
  estimatedEarnings: number,
  availableRides: number
) {
  const result = await broadcastNotification({
    zoneId,
    broadcastType: 'EARNINGS_OPPORTUNITY',
    title: `💰 Earning Opportunity`,
    message: `Potential ${formatCurrency(estimatedEarnings)} earnings in ${zoneName}. ${availableRides} rides available now!`,
    targetAudience: 'ALL_ONLINE_RIDERS',
    referenceId: zoneId,
    referenceType: 'ZONE',
    metadata: { estimatedEarnings, availableRides, zoneName },
    expiresInMinutes: 45,
  });

  return result;
}

/**
 * Send driver reposition request
 */
export async function requestDriverReposition(
  targetZoneId: string,
  targetZoneName: string,
  fromZoneName?: string,
  bonusAmount?: number
) {
  const bonusText = bonusAmount ? ` Plus ${formatCurrency(bonusAmount)} bonus!` : '';

  const result = await broadcastNotification({
    zoneId: targetZoneId,
    broadcastType: 'DRIVER_REQUEST',
    title: `📍 Drivers Needed in ${targetZoneName}`,
    message: `High demand area needs drivers.${fromZoneName ? ` Move from ${fromZoneName} to ${targetZoneName}.` : ''}${bonusText}`,
    targetAudience: 'ZONE_RIDERS',
    referenceId: targetZoneId,
    referenceType: 'ZONE',
    metadata: { targetZoneName, fromZoneName, bonusAmount },
    expiresInMinutes: 30,
  });

  return result;
}

/**
 * Send promotion notification to clients
 */
export async function notifyClientPromotion(
  promoCode: string,
  discountPercent: number,
  zoneName?: string
) {
  const zoneText = zoneName ? ` in ${zoneName}` : '';

  const result = await broadcastNotification({
    broadcastType: 'PROMOTION_CREATED',
    title: `🎉 ${discountPercent}% Off Your Next Ride!`,
    message: `Use code ${promoCode}${zoneText} to get ${discountPercent}% off. Limited time offer!`,
    targetAudience: 'CLIENTS',
    referenceId: promoCode,
    referenceType: 'PROMOTION',
    metadata: { promoCode, discountPercent, zoneName },
    expiresInMinutes: 120,
  });

  return result;
}

/**
 * Send surge warning to clients in a zone
 */
export async function warnClientsAboutSurge(
  zoneId: string,
  zoneName: string,
  multiplier: number
) {
  const result = await broadcastNotification({
    zoneId,
    broadcastType: 'SURGE_ACTIVATION',
    title: `⚠️ High Demand Alert`,
    message: `Rides in ${zoneName} have ${multiplier.toFixed(1)}x surge pricing due to high demand. Prices will normalize soon.`,
    targetAudience: 'ZONE_CLIENTS',
    referenceId: zoneId,
    referenceType: 'SURGE',
    metadata: { multiplier, zoneName },
    expiresInMinutes: 30,
  });

  return result;
}

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

/**
 * Get or create notification preferences for a user
 */
export async function getNotificationPreferences(userId: string) {
  let prefs = await db.notificationPreference.findUnique({
    where: { userId },
  });

  if (!prefs) {
    prefs = await db.notificationPreference.create({
      data: { userId },
    });
  }

  return prefs;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<{
    surgeAlerts: boolean;
    highDemandAlerts: boolean;
    incentiveAlerts: boolean;
    earningsOpportunities: boolean;
    repositionRequests: boolean;
    surgeWarnings: boolean;
    promoAlerts: boolean;
    discountOffers: boolean;
    taskUpdates: boolean;
    orderUpdates: boolean;
    paymentUpdates: boolean;
    systemUpdates: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  }>
) {
  const prefs = await db.notificationPreference.upsert({
    where: { userId },
    update: preferences,
    create: {
      userId,
      ...preferences,
    },
  });

  return prefs;
}

/**
 * Check if user should receive notification based on preferences
 */
export async function shouldSendNotification(
  userId: string,
  notificationType: NotificationType
): Promise<boolean> {
  const prefs = await getNotificationPreferences(userId);

  // Check quiet hours
  if (prefs.quietHoursEnabled) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMin] = (prefs.quietHoursStart || '22:00').split(':').map(Number);
    const [endHour, endMin] = (prefs.quietHoursEnd || '07:00').split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime > endTime) {
      if (currentTime >= startTime || currentTime < endTime) {
        return false;
      }
    } else {
      if (currentTime >= startTime && currentTime < endTime) {
        return false;
      }
    }
  }

  // Check specific notification type preferences
  switch (notificationType) {
    case 'SURGE_ALERT':
      return prefs.surgeAlerts;
    case 'HIGH_DEMAND_ZONE':
      return prefs.highDemandAlerts;
    case 'INCENTIVE_AVAILABLE':
      return prefs.incentiveAlerts;
    case 'EARNINGS_OPPORTUNITY':
      return prefs.earningsOpportunities;
    case 'DRIVER_REPOSITION':
      return prefs.repositionRequests;
    case 'SURGE_WARNING':
      return prefs.surgeWarnings;
    case 'PROMO_AVAILABLE':
      return prefs.promoAlerts;
    case 'DISCOUNT_OFFER':
      return prefs.discountOffers;
    case 'TASK_UPDATE':
      return prefs.taskUpdates;
    case 'ORDER_UPDATE':
      return prefs.orderUpdates;
    case 'PAYMENT':
      return prefs.paymentUpdates;
    case 'SYSTEM':
      return prefs.systemUpdates;
    default:
      return true;
  }
}

// ============================================
// BROADCAST HISTORY
// ============================================

/**
 * Get broadcast history
 */
export async function getBroadcastHistory(options?: {
  limit?: number;
  offset?: number;
  zoneId?: string;
  broadcastType?: BroadcastTypeInput;
  status?: string;
}) {
  const where: Record<string, unknown> = {};

  if (options?.zoneId) where.zoneId = options.zoneId;
  if (options?.broadcastType) where.broadcastType = options.broadcastType;
  if (options?.status) where.status = options.status;

  const broadcasts = await db.notificationBroadcast.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 20,
    skip: options?.offset || 0,
  });

  const total = await db.notificationBroadcast.count({ where });

  return { broadcasts, total };
}

/**
 * Get broadcast statistics
 */
export async function getBroadcastStats() {
  const [total, pending, sent, failed, recentBroadcasts] = await Promise.all([
    db.notificationBroadcast.count(),
    db.notificationBroadcast.count({ where: { status: 'PENDING' } }),
    db.notificationBroadcast.count({ where: { status: 'SENT' } }),
    db.notificationBroadcast.count({ where: { status: 'FAILED' } }),
    db.notificationBroadcast.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalRecipients = await db.notificationBroadcast.aggregate({
    _sum: { recipientsCount: true },
  });

  return {
    total,
    pending,
    sent,
    failed,
    totalRecipients: totalRecipients._sum.recipientsCount || 0,
    recentBroadcasts,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(amount);
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
    // Internal HTTP emit API runs on port 3002 (Socket.io WebSocket is on 3001)
    const socketPort = process.env.SOCKET_PORT || '3002';
    const response = await fetch(`http://localhost:${socketPort}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024',
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
