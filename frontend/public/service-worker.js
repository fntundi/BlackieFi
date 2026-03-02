/* eslint-disable no-restricted-globals */

// BlackieFi Service Worker - PWA Support
// Provides offline capability and caching

const CACHE_NAME = 'blackiefi-v1';
const STATIC_CACHE = 'blackiefi-static-v1';
const DYNAMIC_CACHE = 'blackiefi-dynamic-v1';
const API_CACHE = 'blackiefi-api-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// API endpoints to cache for offline access
const CACHEABLE_API_PATTERNS = [
  /\/api\/entities$/,
  /\/api\/accounts$/,
  /\/api\/categories$/,
  /\/api\/budgets$/,
  /\/api\/goals$/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('blackiefi-') && 
                   name !== STATIC_CACHE && 
                   name !== DYNAMIC_CACHE &&
                   name !== API_CACHE;
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip websocket and extension requests
  if (url.protocol === 'chrome-extension:' || url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }
  
  // API requests - network first, then cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Static assets - cache first, then network
  event.respondWith(cacheFirstStrategy(request));
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Return cached version and update cache in background
    updateCache(request);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    throw error;
  }
}

// Network-first strategy for API requests
async function networkFirstStrategy(request) {
  const url = new URL(request.url);
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses for specific endpoints
    if (networkResponse.ok && isCacheableApiRequest(url.pathname)) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Try to return cached API response
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving cached API response:', url.pathname);
      return cachedResponse;
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        error: 'You are offline', 
        offline: true,
        cached: false 
      }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// Check if API request should be cached
function isCacheableApiRequest(pathname) {
  return CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(pathname));
}

// Update cache in background
async function updateCache(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silently fail - we already have a cached version
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data?.text() || 'New notification from BlackieFi',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      { action: 'view', title: 'View', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification('BlackieFi', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        // Focus existing window or open new one
        if (clients.length > 0) {
          return clients[0].focus();
        }
        return self.clients.openWindow('/dashboard');
      })
    );
  }
});

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncPendingTransactions());
  }
});

// Sync pending transactions when online
async function syncPendingTransactions() {
  try {
    // Get pending transactions from IndexedDB
    // This would be implemented based on your offline storage strategy
    console.log('[SW] Syncing pending transactions...');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

console.log('[SW] Service worker loaded');
