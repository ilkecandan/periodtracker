const CACHE_NAME = 'tempest-tracker-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png'
];

// INSTALL: Cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ACTIVATE: Clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// FETCH: Network-first for pages, cache-first for assets
self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first strategy for known static assets
  if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
    event.respondWith(
      caches.match(request).then(res => res || fetch(request))
    );
    return;
  }

  // Network-first strategy for everything else
  event.respondWith(
    fetch(request)
      .then(res => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, resClone));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
