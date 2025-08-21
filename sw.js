const CACHE_NAME = 'period-tracker-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/script/main.js',
  '/manifest.json',
  '/images/icon-192.png',
  '/images/icon-512.png'
];

// INSTALL: Cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // activate new SW immediately
});

// ACTIVATE: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // take control of open clients
});

// FETCH: Try network first, fallback to cache
self.addEventListener('fetch', event => {
  const { request } = event;

  // Handle only GET requests
  if (request.method !== 'GET') return;

  // For static assets: cache-first
  if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        return cachedResponse || fetch(request);
      })
    );
    return;
  }

  // For everything else: network-first
  event.respondWith(
    fetch(request)
      .then(response => {
        // Save a copy in cache
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(request, response.clone());
          return response;
        });
      })
      .catch(() => caches.match(request)) // fallback to cache if offline
  );
});
