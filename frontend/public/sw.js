/**
 * Service Worker for Agent Audit Dashboard
 * Provides offline support, caching, and background sync
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `agent-audit-${CACHE_VERSION}`;
const RUNTIME_CACHE = `agent-audit-runtime-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ============================================================================
// INSTALL EVENT - Precache static assets
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Precaching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheName.startsWith('agent-audit-') || cacheName !== CACHE_NAME) {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Take control of all pages immediately
  self.clients.claim();
});

// ============================================================================
// FETCH EVENT - Network-first strategy with fallback
// ============================================================================

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external origins (API calls use different strategy)
  if (new URL(event.request.url).origin !== location.origin) {
    return event.respondWith(fetch(event.request));
  }

  // HTML pages - Network first
  if (event.request.headers.get('accept')?.includes('text/html')) {
    return event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache for offline
          return caches.match(event.request);
        })
    );
  }

  // JS/CSS - Cache first with network fallback
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style'
  ) {
    return event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => c.put(event.request, response.clone()));
          }
          return response;
        });
      })
    );
  }

  // Images - Cache first with network fallback
  if (event.request.destination === 'image') {
    return event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              const cache = caches.open(RUNTIME_CACHE);
              cache.then((c) => c.put(event.request, response.clone()));
            }
            return response;
          })
          .catch(() => {
            // Return placeholder image for failed images
            return caches.match('/placeholder.png');
          });
      })
    );
  }

  // Default - Network first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// ============================================================================
// MESSAGE HANDLER - Communication with clients
// ============================================================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    caches.open(RUNTIME_CACHE).then((cache) => {
      cache.addAll(event.data.urls || []);
    });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(RUNTIME_CACHE);
  }
});

// ============================================================================
// BACKGROUND SYNC - Sync failed requests when back online
// ============================================================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

async function syncTransactions() {
  try {
    // Placeholder for syncing failed transactions
    console.log('Syncing transactions with server...');
  } catch (error) {
    console.error('Failed to sync transactions:', error);
    throw error; // Retry
  }
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();

  const options = {
    body: data.body || 'New notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Agent Audit Dashboard', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }

      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});

// ============================================================================
// PERIODIC BACKGROUND SYNC
// ============================================================================

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-agents') {
    event.waitUntil(updateAgents());
  }
});

async function updateAgents() {
  try {
    // Placeholder for periodic agent updates
    console.log('Periodic background sync: updating agents...');
  } catch (error) {
    console.error('Failed to update agents:', error);
    throw error; // Retry
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get network status
 */
function isOnline() {
  return navigator.onLine;
}

/**
 * Log service worker events
 */
function log(message, data) {
  console.log(`[SW] ${message}`, data || '');
}
