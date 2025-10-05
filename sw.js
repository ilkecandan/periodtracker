// sw.js
// Version bump this when you change cached assets
const CACHE_NAME = 'tempest-tracker-v5';

// Detect the deployed base path from the service worker scope
// e.g. on GitHub Pages this becomes "/periodtracker/"
const BASE = new URL(self.registration.scope).pathname;

// Core assets to precache (use absolute paths so subpaths work)
const STATIC_ASSETS = [
  BASE,
  `${BASE}index.html`,
  `${BASE}about.html`,
  `${BASE}manifest.json`,
  // Use the real-sized icons you added per manifest step
  `${BASE}images/icon-192.png`,
  `${BASE}images/icon-512.png`
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
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k === CACHE_NAME ? Promise.resolve() : caches.delete(k)))
      );
      await self.clients.claim();
    })()
  );
});

// FETCH:
// - navigation requests → network-first with offline fallback to cached index.html
// - same-origin static assets → stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin; bail on cross-origin (CDNs, analytics, etc.)
  const sameOrigin = url.origin === self.location.origin;

  // Handle SPA/MPA navigations with network-first, offline fallback
  if (req.mode === 'navigate' && sameOrigin) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        // Cache the landing page for offline fallback
        const cache = await caches.open(CACHE_NAME);
        await cache.put(`${BASE}index.html`, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(`${BASE}index.html`);
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Static assets: Stale-While-Revalidate for same-origin GETs
  if (sameOrigin && req.method === 'GET') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const networkPromise = fetch(req).then((res) => {
        if (res && res.status === 200) {
          cache.put(req, res.clone());
        }
        return res;
      }).catch(() => cached);

      return cached || networkPromise;
    })());
  }
});
