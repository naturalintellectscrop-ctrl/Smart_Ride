/**
 * Push Notification Service for Smart Ride
 * Handles sending push notifications via Expo Push API
 * Falls back to Firebase Cloud Messaging (server-side) when Expo tokens are unavailable
 *
 * Flow:
 * 1. Try Expo Push tokens first (for mobile app users)
 * 2. If no Expo tokens found, fall back to FCM server-side (for web/PWA users)
 * 3. FCM also handles invalid token cleanup
 */

import { db } from '@/lib/db';
import { notificationLogger } from '@/lib/logging/logger';
import { fcmServerService } from '@/lib/firebase/fcm-server-service';

interface PushPayload {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  /**
   * Android notification channel. On Android 8+ the channel — not this
   * payload — decides whether a notification makes a sound, vibrates, or
   * shows a heads-up banner. Omitting it drops the alert onto the default
   * channel, which is why a backgrounded driver got a quiet tick for a ride
   * offer that expires in seconds.
   *
   * Must match an id created in the app's notification-channels.ts.
   */
  channelId?: PushChannel;
}

/** Channel ids the mobile app creates at launch. Keep in sync with
 *  `expo-app/src/services/notification-channels.ts`. */
export type PushChannel = 'ride-offers-v1' | 'trip-updates-v1' | 'general-v1';

/** Rings loudly and insistently — for time-critical job offers. */
export const CHANNEL_RIDE_OFFERS: PushChannel = 'ride-offers-v1';
/** Audible but ordinary — trip and order progress. */
export const CHANNEL_TRIP_UPDATES: PushChannel = 'trip-updates-v1';
/** Everything else. */
export const CHANNEL_GENERAL: PushChannel = 'general-v1';

/**
 * Check if push notification service is properly configured.
 * Always returns true since at least one provider (Expo or FCM) may be available.
 */
export function isConfigured(): boolean {
  // Expo Push API doesn't require API keys — it's always available
  // as long as users have registered push tokens in the database.
  // FCM server-side may also be available as a fallback.
  return true;
}

/** Boolean export for quick checks */
export const pushConfigured = isConfigured();

/**
 * Send push notification to a user's devices
 * Tries Expo Push first, then falls back to FCM server-side if no Expo tokens found
 */
export async function sendPushNotification(payload: PushPayload): Promise<void> {
  try {
    // === Strategy 1: Expo Push Tokens (mobile app users) ===
    const expoTokens = await db.expoPushToken.findMany({
      where: { userId: payload.userId, isActive: true },
    });

    if (expoTokens.length > 0) {
      await sendViaExpoPush(expoTokens, payload);
      return;
    }

    // === Strategy 2: FCM Server-Side (web/PWA users) ===
    // Look for FCM tokens stored in the database ( ExpoPushToken can also hold FCM tokens
    // from web clients, or we can check for a separate token type)
    const fcmTokens = await getFCMTokensForUser(payload.userId);

    if (fcmTokens.length > 0 && fcmServerService.isConfigured()) {
      await sendViaFCMServer(fcmTokens, payload);
      return;
    }

    // No tokens found — user has no registered devices
  } catch (error) {
    notificationLogger.warn('Failed to send push notification:', { error: String(error) });
    // Don't throw — push notification failure should not break the main flow
  }
}

/**
 * Send via Expo Push API
 */
async function sendViaExpoPush(
  tokens: { token: string }[],
  payload: PushPayload
): Promise<void> {
  // Build Expo push messages
  const messages = tokens.map(t => ({
    to: t.token,
    title: payload.title,
    body: payload.message,
    data: payload.data || {},
    sound: 'default' as const,
    priority: 'high' as const,
    // Android routes the alert by channel; iOS ignores this field.
    channelId: payload.channelId ?? CHANNEL_GENERAL,
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
    notificationLogger.error('Expo push API error:', { status: response.status });
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
}

/**
 * Send via FCM Server-Side (firebase-admin)
 */
async function sendViaFCMServer(
  tokens: string[],
  payload: PushPayload
): Promise<void> {
  const fcmMessage = {
    title: payload.title,
    body: payload.message,
    data: payload.data
      ? Object.fromEntries(
          Object.entries(payload.data).map(([k, v]) => [k, String(v)])
        )
      : undefined,
  };

  const result = await fcmServerService.sendToDevices(tokens, fcmMessage);

  // Deactivate invalid FCM tokens
  if (result.invalidTokens.length > 0) {
    await db.expoPushToken.updateMany({
      where: {
        token: { in: result.invalidTokens },
        userId: payload.userId,
      },
      data: { isActive: false },
    });
  }
}

/**
 * Get FCM tokens for a user from the database
 * These could be stored in ExpoPushToken table with a different prefix
 * or a dedicated FCM token table. For now, we check ExpoPushToken for
 * non-Expo tokens (Expo tokens start with "ExponentPushToken[")
 */
async function getFCMTokensForUser(userId: string): Promise<string[]> {
  try {
    // Get all active tokens that are NOT Expo push tokens
    // Expo tokens start with "ExponentPushToken[" — FCM tokens are longer base64 strings
    const tokens = await db.expoPushToken.findMany({
      where: {
        userId,
        isActive: true,
        NOT: {
          token: { startsWith: 'ExponentPushToken[' },
        },
      },
      select: { token: true },
    });

    return tokens.map(t => t.token);
  } catch {
    // Table might not exist or other DB error
    return [];
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
