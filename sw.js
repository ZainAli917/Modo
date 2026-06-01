const CACHE_NAME = 'modo-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/offline.html'
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // Activate immediately
});

// Activate & claim all clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim(); // Take control immediately
});

// Fetch strategy: network first, fallback to cache, then offline page
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match('/offline.html');
        });
      })
  );
});

// Message handler for skip waiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background Sync (dummy)
self.addEventListener('sync', event => {
  if (event.tag === 'modo-sync') {
    console.log('Sync triggered');
  }
});

// Periodic Sync (dummy)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'modo-periodic') {
    console.log('Periodic sync triggered');
  }
});

// Push Notification (dummy)
self.addEventListener('push', event => {
  const options = {
    body: 'Modo update',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="192" height="192"%3E%3Crect width="192" height="192" fill="%234CAF50"/%3E%3Ctext x="96" y="96" font-size="72" fill="white" text-anchor="middle" dominant-baseline="central"%3EM%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect width="96" height="96" fill="%234CAF50"/%3E%3C/svg%3E'
  };
  event.waitUntil(self.registration.showNotification('Modo', options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});