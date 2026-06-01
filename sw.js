const CACHE_NAME = 'modo-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/offline.html'
];

// Install & Cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  // Activate new service worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  // Take control of all pages immediately
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => {
        // If offline and it's a navigation request, show offline page
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});

// Handle skip waiting message from page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ---------- BACKGROUND SYNC ----------
self.addEventListener('sync', event => {
  if (event.tag === 'modo-sync') {
    console.log('Background Sync triggered');
  }
});

// ---------- PERIODIC SYNC ----------
self.addEventListener('periodicsync', event => {
  if (event.tag === 'modo-periodic') {
    console.log('Periodic Sync triggered');
  }
});

// ---------- PUSH NOTIFICATIONS ----------
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Modo update',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="192" height="192"%3E%3Crect width="192" height="192" fill="%234CAF50"/%3E%3Ctext x="96" y="96" font-size="72" fill="white" text-anchor="middle" dominant-baseline="central"%3EM%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect width="96" height="96" fill="%234CAF50"/%3E%3C/svg%3E'
  };
  event.waitUntil(self.registration.showNotification('Modo', options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});