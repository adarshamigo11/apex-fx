// Minimal network-first service worker (PWA shell + offline fallback)
const CACHE = 'apexfx-v2';
const OFFLINE_PAGE = '/offline.html';
const STATIC_ASSETS = ['/offline.html', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept API calls
  if (url.pathname.startsWith('/api')) return;

  // For navigation requests (HTML pages) — always go to network first
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_PAGE))
    );
    return;
  }

  // For static assets — network first, fallback to cache
  e.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/))) {
          const clone = response.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Push notification ready
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'ApexFX', body: 'Notification' };
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/icons/icon-192.png' }));
});
