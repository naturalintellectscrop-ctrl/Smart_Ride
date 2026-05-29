/**
 * @deprecated This module is DEPRECATED. Use @/lib/services/notification.service instead.
 * This file is kept only for backward compatibility and will be removed in a future release.
 * All functionality has been consolidated into the canonical notification service at:
 *   @/lib/services/notification.service.ts
 *
 * Migration guide:
 *   import { ... } from '@/lib/notifications/notification-service'
 *   →
 *   import { ... } from '@/lib/services/notification.service'
 */

// Re-export everything from the canonical notification service
export {
  // Core notification functions
  createNotification,
  createNotifications,
  createNotificationsForUsers,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,

  // Types
  type CreateNotificationInput,
  type NotificationResult,
  type BroadcastInput,
  type BroadcastTypeInput,
  type TargetAudienceInput,

  // Notification templates
  sendTaskUpdateNotification,
  sendOrderUpdateNotification,
  sendPaymentNotification,
  sendSOSAlertNotification,

  // Dispatch notification helpers
  sendDispatchReassignedNotification,
  sendSearchingNotification,
  sendDeliveredNotification,

  // Broadcast functions
  broadcastNotification,

  // Marketplace balance notifications
  notifySurgeActivation,
  notifyHighDemand,
  notifyNewIncentive,
  notifyEarningsOpportunity,
  requestDriverReposition,
  notifyClientPromotion,
  warnClientsAboutSurge,

  // Notification preferences
  getNotificationPreferences,
  updateNotificationPreferences,
  shouldSendNotification,

  // Broadcast history
  getBroadcastHistory,
  getBroadcastStats,
} from '@/lib/services/notification.service';
