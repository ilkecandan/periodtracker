// sw.js
// Version bump this when you change cached assets
const CACHE_NAME = 'tempest-tracker-v4';

const STATIC_ASSETS = [
  './',
  './index.html',
  './about.html',
  './manifest.json',
  './images/icon.png' // update once you add real 192/512 icons (see manifest step)
];

// INSTALL: pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ACTIVATE: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// FETCH: 
// - navigation requests → network-first with offline fallback to cached index.html
// - static assets → stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Handle SPA navigations
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match('./index.html');
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Static assets: SWR
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const networkPromise = fetch(req).then((res) => {
      // cache successful GETs
      if (req.method === 'GET' && res && res.status === 200) {
        cache.put(req, res.clone());
      }
      return res;
    }).catch(() => cached);

    return cached || networkPromise;
  })());
});
