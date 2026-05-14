/**
 * Firebase Cloud Messaging Service Worker
 * 
 * Handles background push notifications for Smart Ride.
 * This service worker is specifically for FCM background message handling.
 * 
 * Note: This runs alongside the main sw.js service worker.
 */

// Firebase Configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDummyKeyForPlaceholder",
  authDomain: "smart-ride-489806.firebaseapp.com",
  projectId: "smart-ride-489806",
  storageBucket: "smart-ride-489806.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789"
};

// Import Firebase scripts (required for background message handling)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp(FIREBASE_CONFIG);

// Get Messaging instance
const messaging = firebase.messaging();

// ==========================================
// Background Message Handler
// ==========================================

/**
 * Handle background messages
 * This is triggered when a message is received while the app is in the background
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[Firebase SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Smart Ride';
  const notificationBody = payload.notification?.body || 'You have a new notification';
  const notificationImage = payload.notification?.image || '/icons/icon-192x192.png';
  
  // Extract data for notification actions
  const data = payload.data || {};
  const notificationType = data.type || 'general';
  const referenceId = data.referenceId || '';
  const referenceType = data.referenceType || '';
  const clickAction = data.clickAction || data.url || '/';

  // Notification options
  const notificationOptions: NotificationOptions = {
    body: notificationBody,
    icon: notificationImage,
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    tag: `smart-ride-${notificationType}-${referenceId}`, // Group similar notifications
    data: {
      url: clickAction,
      type: notificationType,
      referenceId,
      referenceType,
      timestamp: Date.now(),
    },
    requireInteraction: shouldRequireInteraction(notificationType),
    actions: getNotificationActions(notificationType, data),
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ==========================================
// Notification Click Handler
// ==========================================

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase SW] Notification clicked:', event);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const url = notificationData.url || '/';
  const action = event.action;

  // Handle action button clicks
  if (action) {
    handleNotificationAction(action, notificationData);
    return;
  }

  // Default action - open/focus the app
  event.waitUntil(
    handleNotificationClick(url, notificationData)
  );
});

/**
 * Handle notification click - open or focus app window
 */
async function handleNotificationClick(url: string, data: Record<string, unknown>) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Check if app is already open
  for (const client of clients) {
    if (client.url.includes(self.location.origin) && 'focus' in client) {
      // Focus existing window and navigate
      if ('navigate' in client) {
        (client as WindowClient).navigate(url);
      }
      return client.focus();
    }
  }

  // App not open - open new window
  if (self.clients.openWindow) {
    return self.clients.openWindow(url);
  }
}

/**
 * Handle notification action button clicks
 */
function handleNotificationAction(action: string, data: Record<string, unknown>) {
  console.log('[Firebase SW] Action clicked:', action, data);

  switch (action) {
    case 'accept':
      // Handle accept action (e.g., accept ride request)
      handleAcceptAction(data);
      break;
    case 'decline':
      // Handle decline action
      handleDeclineAction(data);
      break;
    case 'view':
      // View details - same as default click
      handleNotificationClick(data.url || '/', data);
      break;
    case 'dismiss':
      // Just close - already done
      break;
    default:
      console.log('[Firebase SW] Unknown action:', action);
  }
}

/**
 * Handle accept action (for ride/task requests)
 */
async function handleAcceptAction(data: Record<string, unknown>) {
  try {
    const response = await fetch('/api/tasks/accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: data.referenceId,
      }),
    });

    if (response.ok) {
      // Navigate to task details
      handleNotificationClick(`/task/${data.referenceId}`, data);
    }
  } catch (error) {
    console.error('[Firebase SW] Accept action failed:', error);
  }
}

/**
 * Handle decline action
 */
async function handleDeclineAction(data: Record<string, unknown>) {
  try {
    await fetch('/api/tasks/decline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: data.referenceId,
      }),
    });
  } catch (error) {
    console.error('[Firebase SW] Decline action failed:', error);
  }
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Determine if notification should require interaction
 */
function shouldRequireInteraction(type: string): boolean {
  const interactiveTypes = [
    'RIDE_REQUEST',
    'TASK_ASSIGNMENT',
    'ORDER_REQUEST',
    'SOS_ALERT',
    'PAYMENT_REQUIRED',
  ];
  return interactiveTypes.includes(type);
}

/**
 * Get notification action buttons based on type
 */
function getNotificationActions(type: string, data: Record<string, unknown>): NotificationAction[] {
  const actionSets: Record<string, NotificationAction[]> = {
    RIDE_REQUEST: [
      { action: 'accept', title: '✓ Accept', icon: '/icons/check.png' },
      { action: 'decline', title: '✗ Decline', icon: '/icons/close.png' },
    ],
    TASK_ASSIGNMENT: [
      { action: 'accept', title: '✓ Accept', icon: '/icons/check.png' },
      { action: 'decline', title: '✗ Decline', icon: '/icons/close.png' },
    ],
    ORDER_REQUEST: [
      { action: 'view', title: '👁 View Order', icon: '/icons/eye.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/close.png' },
    ],
    SOS_ALERT: [
      { action: 'view', title: '🚨 View Alert', icon: '/icons/alert.png' },
    ],
    PAYMENT: [
      { action: 'view', title: '💳 View Payment', icon: '/icons/payment.png' },
    ],
    PROMOTION: [
      { action: 'view', title: '🎁 View Offer', icon: '/icons/gift.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/close.png' },
    ],
  };

  return actionSets[type] || [];
}

// ==========================================
// Push Event Handler (Fallback)
// ==========================================

/**
 * Handle push events (for non-FCM push notifications)
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    console.log('[Firebase SW] Push event received:', data);

    const options: NotificationOptions = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || data.clickAction || '/',
        type: data.type || 'general',
        referenceId: data.referenceId,
        referenceType: data.referenceType,
      },
      actions: data.actions || [],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Smart Ride', options)
    );
  } catch (error) {
    console.error('[Firebase SW] Push event error:', error);
  }
});

// ==========================================
// Service Worker Lifecycle
// ==========================================

/**
 * Install event
 */
self.addEventListener('install', (event) => {
  console.log('[Firebase SW] Installing...');
  self.skipWaiting();
});

/**
 * Activate event
 */
self.addEventListener('activate', (event) => {
  console.log('[Firebase SW] Activated');
  event.waitUntil(self.clients.claim());
});

// ==========================================
// Message Handler (Communication with App)
// ==========================================

/**
 * Handle messages from the main app
 */
self.addEventListener('message', (event) => {
  console.log('[Firebase SW] Message received:', event.data);

  if (event.data.type === 'GET_TOKEN') {
    // Handle token request
    messaging.getToken().then((token) => {
      event.ports[0].postMessage({ token });
    }).catch((error) => {
      event.ports[0].postMessage({ error: error.message });
    });
  }

  if (event.data.type === 'UNSUBSCRIBE') {
    // Handle unsubscription
    messaging.deleteToken().then(() => {
      event.ports[0].postMessage({ success: true });
    }).catch((error) => {
      event.ports[0].postMessage({ success: false, error: error.message });
    });
  }
});

console.log('[Firebase SW] Service Worker loaded');
