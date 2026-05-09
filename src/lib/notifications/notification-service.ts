// Notification Service
// Handles creating, broadcasting, and managing notifications for drivers and clients

import { db } from '@/lib/db';
import { NotificationType } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: string;
  referenceType?: string;
}

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

// ============================================
// CORE NOTIFICATION FUNCTIONS
// ============================================

/**
 * Create a notification for a specific user
 */
export async function createNotification(input: CreateNotificationInput) {
  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      referenceId: input.referenceId || null,
      referenceType: input.referenceType || null,
    },
  });

  return notification;
}

/**
 * Create notifications for multiple users
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
      type: notification.type,
      referenceId: notification.referenceId || null,
      referenceType: notification.referenceType || null,
    })),
  });

  return notifications;
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    types?: NotificationType[];
  }
) {
  const where: Record<string, unknown> = { userId };
  
  if (options?.unreadOnly) {
    where.isRead = false;
  }
  
  if (options?.types && options.types.length > 0) {
    where.type = { in: options.types };
  }

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    db.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return { notifications, unreadCount };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  const notification = await db.notification.updateMany({
    where: { id: notificationId, userId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return notification;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  const result = await db.notification.updateMany({
    where: { userId, isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return result;
}

// ============================================
// BROADCAST FUNCTIONS
// ============================================

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
    recipientCount: userIds.length 
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
    case 'ALL_ONLINE_RIDERS':
      // Get all online riders
      const onlineRiders = await db.rider.findMany({
        where: { 
          isOnline: true,
          status: 'APPROVED',
        },
        select: { userId: true },
      });
      return onlineRiders.map(r => r.userId).filter(Boolean) as string[];

    case 'RIDERS':
      // Get all approved riders
      const allRiders = await db.rider.findMany({
        where: { status: 'APPROVED' },
        select: { userId: true },
      });
      return allRiders.map(r => r.userId).filter(Boolean) as string[];

    case 'CLIENTS':
      // Get all clients
      const clients = await db.user.findMany({
        where: { role: 'CLIENT', status: 'ACTIVE' },
        select: { id: true },
      });
      return clients.map(c => c.id);

    case 'ALL':
      // Get all active users
      const allUsers = await db.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });
      return allUsers.map(u => u.id);

    case 'ZONE_RIDERS':
      // Get riders in a specific zone (by location proximity)
      if (!zoneId) return [];
      const zone = await db.geographicZone.findUnique({
        where: { id: zoneId },
      });
      if (!zone) return [];

      // Find riders within zone radius
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
          currentLongitude: true 
        },
      });

      // Filter by distance (simplified - using bounding box)
      const radiusKm = zone.radiusKm || 5;
      const latDiff = radiusKm / 111; // ~111km per degree latitude
      const lngDiff = radiusKm / (111 * Math.cos(zone.centerLatitude * Math.PI / 180));

      const nearbyRiders = zoneRiders.filter(r => {
        if (!r.currentLatitude || !r.currentLongitude) return false;
        const latMatch = Math.abs(r.currentLatitude - zone.centerLatitude) <= latDiff;
        const lngMatch = Math.abs(r.currentLongitude - zone.centerLongitude) <= lngDiff;
        return latMatch && lngMatch;
      });

      return nearbyRiders.map(r => r.userId).filter(Boolean) as string[];

    case 'ZONE_CLIENTS':
      // Get clients in a specific zone (recent activity)
      if (!zoneId) return [];
      
      // For now, return all clients (in production, would use location tracking)
      const zoneClients = await db.user.findMany({
        where: { role: 'CLIENT', status: 'ACTIVE' },
        select: { id: true },
      });
      return zoneClients.map(c => c.id);

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
  // Client-facing notifications
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

  // Rider-facing notifications
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
    expiresInMinutes: 60, // Surge notifications expire in 1 hour
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
    expiresInMinutes: 240, // 4 hours
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
    expiresInMinutes: 120, // 2 hours
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
      // Quiet hours span midnight (e.g., 22:00 - 07:00)
      if (currentTime >= startTime || currentTime < endTime) {
        return false;
      }
    } else {
      // Quiet hours within same day
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
