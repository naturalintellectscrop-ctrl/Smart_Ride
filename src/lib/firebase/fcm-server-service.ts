/**
 * Server-Side Firebase Cloud Messaging Service
 *
 * Uses firebase-admin SDK for server-side push notifications.
 * Supports sending to individual devices, batch devices, and topics/zones.
 *
 * Configuration (in order of priority):
 * 1. Individual env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * 2. JSON string: FIREBASE_SERVICE_ACCOUNT
 */

import * as admin from 'firebase-admin';
import { notificationLogger } from '@/lib/logging/logger';

// ==========================================
// Types
// ==========================================

export interface FirebaseMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  invalidToken?: boolean;
}

export interface BatchSendResult {
  successCount: number;
  failureCount: number;
  results: SendResult[];
  invalidTokens: string[];
}

export interface TopicSubscriptionResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

// ==========================================
// FCMServerService Class
// ==========================================

class FCMServerService {
  private app: admin.app.App | null = null;
  private initialized = false;
  private initError: string | null = null;

  /**
   * Initialize Firebase Admin app with service account credentials
   */
  initialize(): void {
    if (this.initialized) return;

    try {
      // Check if firebase-admin is already initialized
      if (admin.apps.length > 0) {
        this.app = admin.apps[0];
        this.initialized = true;
        return;
      }

      // Try individual env vars first, then fall back to JSON string
      const serviceAccount = this.getServiceAccount();

      if (!serviceAccount) {
        this.initError = 'Firebase Admin credentials not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT environment variables.';
        // Use debug level — missing Firebase config is expected in development
        notificationLogger.debug(this.initError);
        this.initialized = true; // Mark as initialized to avoid retrying
        return;
      }

      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.initialized = true;
      notificationLogger.info('Firebase Admin initialized successfully');
    } catch (error) {
      this.initError = `Firebase Admin initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      // Only warn — missing/misconfigured Firebase is not fatal
      notificationLogger.warn(this.initError);
      this.initialized = true; // Mark as initialized to avoid retrying
    }
  }

  /**
   * Get service account credentials from environment variables
   */
  private getServiceAccount(): admin.ServiceAccount | null {
    // Priority 1: Individual env vars
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      return {
        projectId,
        clientEmail,
        // Replace escaped newlines with actual newlines
        privateKey: privateKey.replace(/\\n/g, '\n'),
      };
    }

    // Priority 2: JSON string
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      try {
        const parsed = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
        if (parsed.projectId && parsed.clientEmail && parsed.privateKey) {
          return {
            projectId: parsed.projectId,
            clientEmail: parsed.clientEmail,
            privateKey: parsed.privateKey.replace(/\\n/g, '\n'),
          };
        }
      } catch {
        notificationLogger.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
      }
    }

    return null;
  }

  /**
   * Check if Firebase Admin is properly configured
   */
  isConfigured(): boolean {
    if (!this.initialized) {
      this.initialize();
    }
    return this.app !== null && this.initError === null;
  }

  /**
   * Get the messaging instance
   */
  private getMessaging(): admin.messaging.Messaging | null {
    if (!this.initialized) {
      this.initialize();
    }
    if (!this.app) return null;
    return admin.messaging(this.app);
  }

  /**
   * Send a notification to a single device
   */
  async sendToDevice(token: string, message: FirebaseMessage): Promise<SendResult> {
    if (!this.isConfigured()) {
      return { success: false, error: this.initError || 'Firebase Admin not configured' };
    }

    const messaging = this.getMessaging();
    if (!messaging) {
      return { success: false, error: 'Firebase Messaging not available' };
    }

    try {
      const messageId = await messaging.send({
        token,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.imageUrl,
        },
        data: message.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'smart_ride_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });

      return { success: true, messageId };
    } catch (error) {
      const err = error as { code?: string; message?: string };

      // Check for invalid token errors
      if (
        err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered'
      ) {
        notificationLogger.warn('FCM: Invalid token detected, should be removed', { token: token.substring(0, 20) + '...' });
        return {
          success: false,
          error: err.message || 'Invalid token',
          invalidToken: true,
        };
      }

      notificationLogger.error('FCM sendToDevice error:', { error: String(error) });
      return {
        success: false,
        error: err.message || 'Failed to send message',
      };
    }
  }

  /**
   * Send a notification to multiple devices (batch)
   * Handles up to 500 tokens per call (Firebase limit)
   */
  async sendToDevices(tokens: string[], message: FirebaseMessage): Promise<BatchSendResult> {
    if (!this.isConfigured()) {
      return {
        successCount: 0,
        failureCount: tokens.length,
        results: tokens.map(() => ({ success: false, error: this.initError || 'Firebase Admin not configured' })),
        invalidTokens: [],
      };
    }

    const messaging = this.getMessaging();
    if (!messaging) {
      return {
        successCount: 0,
        failureCount: tokens.length,
        results: tokens.map(() => ({ success: false, error: 'Firebase Messaging not available' })),
        invalidTokens: [],
      };
    }

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, results: [], invalidTokens: [] };
    }

    // Firebase allows max 500 tokens per batch
    const BATCH_SIZE = 500;
    const allResults: SendResult[] = [];
    const allInvalidTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batchTokens = tokens.slice(i, i + BATCH_SIZE);

      try {
        const response = await messaging.sendEachForMulticast({
          tokens: batchTokens,
          notification: {
            title: message.title,
            body: message.body,
            imageUrl: message.imageUrl,
          },
          data: message.data,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'smart_ride_notifications',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        });

        for (let j = 0; j < response.responses.length; j++) {
          const resp = response.responses[j];
          const token = batchTokens[j];

          if (resp.success) {
            allResults.push({ success: true, messageId: resp.messageId });
          } else {
            const error = resp.error;
            const isInvalidToken =
              error?.code === 'messaging/invalid-registration-token' ||
              error?.code === 'messaging/registration-token-not-registered';

            if (isInvalidToken) {
              allInvalidTokens.push(token);
            }

            allResults.push({
              success: false,
              error: error?.message || 'Unknown error',
              invalidToken: isInvalidToken,
            });
          }
        }
      } catch (error) {
        notificationLogger.error('FCM sendToDevices batch error:', { error: String(error) });
        // Mark entire batch as failed
        for (const _token of batchTokens) {
          allResults.push({
            success: false,
            error: error instanceof Error ? error.message : 'Batch send failed',
          });
        }
      }
    }

    const successCount = allResults.filter(r => r.success).length;
    const failureCount = allResults.filter(r => !r.success).length;

    return {
      successCount,
      failureCount,
      results: allResults,
      invalidTokens: allInvalidTokens,
    };
  }

  /**
   * Send a notification to a topic/zone
   * Topics allow broadcasting to subscribers (e.g., zone-based notifications)
   */
  async sendToTopic(topic: string, message: FirebaseMessage): Promise<SendResult> {
    if (!this.isConfigured()) {
      return { success: false, error: this.initError || 'Firebase Admin not configured' };
    }

    const messaging = this.getMessaging();
    if (!messaging) {
      return { success: false, error: 'Firebase Messaging not available' };
    }

    try {
      const messageId = await messaging.send({
        topic,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.imageUrl,
        },
        data: message.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'smart_ride_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });

      return { success: true, messageId };
    } catch (error) {
      const err = error as { message?: string };
      notificationLogger.error('FCM sendToTopic error:', { topic, error: String(error) });
      return {
        success: false,
        error: err.message || 'Failed to send to topic',
      };
    }
  }

  /**
   * Subscribe devices to a topic
   * Allows grouping devices by zone, region, etc.
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<TopicSubscriptionResult> {
    if (!this.isConfigured()) {
      return {
        successCount: 0,
        failureCount: tokens.length,
        errors: [this.initError || 'Firebase Admin not configured'],
      };
    }

    const messaging = this.getMessaging();
    if (!messaging) {
      return {
        successCount: 0,
        failureCount: tokens.length,
        errors: ['Firebase Messaging not available'],
      };
    }

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, errors: [] };
    }

    try {
      const response = await messaging.subscribeToTopic(tokens, topic);
      const errors: string[] = [];

      if (response.errors && response.errors.length > 0) {
        for (const err of response.errors) {
          errors.push(err.error?.message || 'Subscription failed');
        }
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors,
      };
    } catch (error) {
      const err = error as { message?: string };
      notificationLogger.error('FCM subscribeToTopic error:', { topic, error: String(error) });
      return {
        successCount: 0,
        failureCount: tokens.length,
        errors: [err.message || 'Failed to subscribe to topic'],
      };
    }
  }

  /**
   * Unsubscribe devices from a topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<TopicSubscriptionResult> {
    if (!this.isConfigured()) {
      return {
        successCount: 0,
        failureCount: tokens.length,
        errors: [this.initError || 'Firebase Admin not configured'],
      };
    }

    const messaging = this.getMessaging();
    if (!messaging) {
      return {
        successCount: 0,
        failureCount: tokens.length,
        errors: ['Firebase Messaging not available'],
      };
    }

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, errors: [] };
    }

    try {
      const response = await messaging.unsubscribeFromTopic(tokens, topic);
      const errors: string[] = [];

      if (response.errors && response.errors.length > 0) {
        for (const err of response.errors) {
          errors.push(err.error?.message || 'Unsubscription failed');
        }
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors,
      };
    } catch (error) {
      const err = error as { message?: string };
      notificationLogger.error('FCM unsubscribeFromTopic error:', { topic, error: String(error) });
      return {
        successCount: 0,
        failureCount: tokens.length,
        errors: [err.message || 'Failed to unsubscribe from topic'],
      };
    }
  }
}

// ==========================================
// Singleton Export
// ==========================================

export const fcmServerService = new FCMServerService();

/** Lazy boolean check — does NOT trigger initialization at module load time */
export function isFCMServerConfigured(): boolean {
  return fcmServerService.isConfigured();
}

export default fcmServerService;
