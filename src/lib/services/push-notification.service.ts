/**
 * Push Notification Service for Smart Ride
 * Handles sending push notifications via Expo Push API
 *
 * Flow:
 * 1. createNotification() in notification.service.ts creates DB notification
 * 2. createNotification() calls emitNotification() for socket
 * 3. createNotification() should also call sendPushNotification() for push
 */

import { db } from '@/lib/db';

interface PushPayload {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Send push notification to a user's devices
 */
export async function sendPushNotification(payload: PushPayload): Promise<void> {
  try {
    // Get all active push tokens for the user
    const tokens = await db.expoPushToken.findMany({
      where: { userId: payload.userId, isActive: true },
    });

    if (tokens.length === 0) return;

    // Build Expo push messages
    const messages = tokens.map(t => ({
      to: t.token,
      title: payload.title,
      body: payload.message,
      data: payload.data || {},
      sound: 'default' as const,
      priority: 'high' as const,
    }));

    // Send to Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error('[Push] Expo push API error:', response.status);
      return;
    }

    const result = await response.json();

    // Handle invalid tokens (deactivate them)
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const ticket = result.data[i];
        if (ticket.status === 'error') {
          const errorDetails = ticket.details;
          if (errorDetails?.error === 'DeviceNotRegistered' ||
              errorDetails?.error === 'InvalidCredentials') {
            await db.expoPushToken.updateMany({
              where: { token: tokens[i].token },
              data: { isActive: false },
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('[Push] Failed to send push notification:', error);
    // Don't throw — push notification failure should not break the main flow
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  await Promise.allSettled(
    userIds.map(userId => sendPushNotification({ userId, title, message, data }))
  );
}
