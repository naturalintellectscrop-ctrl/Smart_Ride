// Smart Ride Service Worker - PWA Offline Support
// Cache versioning: increment CACHE_VERSION when assets change
const CACHE_VERSION = 2;
const STATIC_CACHE = `smart-ride-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `smart-ride-dynamic-v${CACHE_VERSION}`;
const API_CACHE = `smart-ride-api-v${CACHE_VERSION}`;

// Maximum entries in dynamic and API caches
const MAX_DYNAMIC_ENTRIES = 100;
const MAX_API_ENTRIES = 50;

// API cache TTL in seconds (5 minutes)
const API_CACHE_TTL = 300;

// Assets to cache immediately on install (app shell)
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
];

// Static asset extensions (cache-first strategy)
const STATIC_EXTENSIONS = [
  '.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.ico', '.json',
];

// Install event - precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Precaching app shell');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting();
});

// Activate event - clean old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Delete caches that don't match current version
            return (
              cacheName.startsWith('smart-ride-') &&
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE
            );
          })
          .map((cacheName) => {
            console.log('[SW] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Helper: trim cache to max entries (LRU-style)
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // Delete oldest entries (first in = first to delete)
    const deleteCount = keys.length - maxEntries;
    await Promise.all(
      keys.slice(0, deleteCount).map((key) => cache.delete(key))
    );
  }
}

// Helper: check if URL is a static asset
function isStaticAsset(url) {
  const pathname = new URL(url).pathname;
  return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

// Helper: check if URL is an API request
function isApiRequest(url) {
  return new URL(url).pathname.startsWith('/api/');
}

// Helper: check if cached API response is still fresh
function isApiCacheFresh(response) {
  const dateHeader = response.headers.get('sw-cache-date');
  if (!dateHeader) return true; // No date header = assume fresh
  const cachedAt = parseInt(dateHeader, 10);
  return Date.now() - cachedAt < API_CACHE_TTL * 1000;
}

// Strategy: Cache-First for static assets
async function cacheFirst(event) {
  const cachedResponse = await caches.match(event.request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(event.request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(event.request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Network failed and no cache - return offline fallback
    if (event.request.destination === 'image') {
      return new Response('', { status: 204 });
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Strategy: Network-First for API requests
async function networkFirst(event) {
  try {
    const networkResponse = await fetch(event.request);
    if (networkResponse.status === 200 && event.request.method === 'GET') {
      // Clone and cache with timestamp
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(API_CACHE);
      // Add custom header for TTL tracking by wrapping the response
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-date', Date.now().toString());
      const body = await responseToCache.blob();
      const cachedResponse = new Response(body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      });
      cache.put(event.request, cachedResponse);
      // Trim API cache
      trimCache(API_CACHE, MAX_API_ENTRIES);
    }
    return networkResponse;
  } catch (error) {
    // Network failed - try cache
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) {
      // Check if stale but still usable
      return cachedResponse;
    }
    return new Response(
      JSON.stringify({ success: false, error: 'You are offline' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Strategy: Stale-While-Revalidate for navigation and dynamic content
async function staleWhileRevalidate(event) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(event.request);

  const fetchPromise = fetch(event.request)
    .then((networkResponse) => {
      if (networkResponse.status === 200) {
        cache.put(event.request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // If both cache and network fail, return offline page
      return caches.match('/').then((fallback) => {
        return fallback || new Response('Offline', { status: 503 });
      });
    });

  // Return cached response immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Main fetch handler
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests (POST, PUT, DELETE etc. should always hit network)
  if (event.request.method !== 'GET') {
    return;
  }

  const url = event.request.url;

  // API requests: Network-First strategy
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event));
    return;
  }

  // Navigation requests: Stale-While-Revalidate
  if (event.request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  // Static assets: Cache-First strategy
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event));
    return;
  }

  // Everything else: Network-First with cache fallback
  event.respondWith(networkFirst(event));
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-rides') {
    event.waitUntil(syncRideRequests());
  }
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrderRequests());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      type: data.type || 'general',
    },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Smart Ride', options));
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Helper functions for background sync
async function syncRideRequests() {
  console.log('[SW] Syncing ride requests...');
}

async function syncOrderRequests() {
  console.log('[SW] Syncing order requests...');
}
