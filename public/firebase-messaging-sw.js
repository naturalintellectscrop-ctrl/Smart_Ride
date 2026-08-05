/**
 * Firebase Cloud Messaging Service Worker
 * 
 * Handles background push notifications for Smart Ride.
 * This service worker is specifically for FCM background message handling.
 * 
 * Note: This runs alongside the main sw.js service worker.
 */

// Firebase Configuration - loaded from runtime config injected by the app
// Service workers can't access process.env, so config is injected via postMessage or indexedDB
let FIREBASE_CONFIG = null;

// Import Firebase scripts (required for background message handling)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase - wait for config to be injected
// The main app will send config via postMessage before FCM is needed
let messaging = null;

// Fallback: try to initialize with config from IndexedDB (if previously stored)
async function tryInitFromIDB() {
  try {
    const db = await indexedDB.open('smart-ride-firebase-config', 1);
    db.onsuccess = (event) => {
      const database = event.target.result;
      try {
        const tx = database.transaction('config', 'readonly');
        const store = tx.objectStore('config');
        const req = store.get('firebase-config');
        req.onsuccess = () => {
          if (req.result && !FIREBASE_CONFIG) {
            FIREBASE_CONFIG = req.result.value;
            firebase.initializeApp(FIREBASE_CONFIG);
            messaging = firebase.messaging();
          }
        };
      } catch (e) {
        // IndexedDB config not available yet
      }
    };
  } catch (e) {
    // IndexedDB not available
  }
}
tryInitFromIDB();

// ==========================================
// Background Message Handler
// ==========================================

/**
 * Handle background messages
 * This is triggered when a message is received while the app is in the background
 */
function setupBackgroundMessageHandler() {
  if (!messaging) return;
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
}

// Set up background message handler after initialization
// Retry mechanism in case messaging isn't ready yet
function initBackgroundHandler() {
  if (messaging) {
    setupBackgroundMessageHandler();
  } else {
    // Retry after a short delay
    setTimeout(initBackgroundHandler, 1000);
  }
}
initBackgroundHandler();

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
      { action: 'accept', title: '✓ Accept' },
      { action: 'decline', title: '✗ Decline' },
    ],
    TASK_ASSIGNMENT: [
      { action: 'accept', title: '✓ Accept' },
      { action: 'decline', title: '✗ Decline' },
    ],
    ORDER_REQUEST: [
      { action: 'view', title: '👁 View Order' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    SOS_ALERT: [
      { action: 'view', title: '🚨 View Alert' },
    ],
    PAYMENT: [
      { action: 'view', title: '💳 View Payment' },
    ],
    PROMOTION: [
      { action: 'view', title: '🎁 View Offer' },
      { action: 'dismiss', title: 'Dismiss' },
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
  // Handle Firebase config injection from main app
  if (event.data && event.data.type === 'FIREBASE_CONFIG' && !FIREBASE_CONFIG) {
    FIREBASE_CONFIG = event.data.config;
    firebase.initializeApp(FIREBASE_CONFIG);
    messaging = firebase.messaging();
    setupBackgroundMessageHandler();
    return;
  }

  console.log('[Firebase SW] Message received:', event.data);

  if (!messaging) return;

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
