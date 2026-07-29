const CACHE_NAME = 'arearnzone-cache-v7';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json?v=7',
  '/manifest.webmanifest?v=7',
  '/pwa-72x72.png?v=7',
  '/pwa-96x96.png?v=7',
  '/pwa-128x128.png?v=7',
  '/pwa-144x144.png?v=7',
  '/pwa-152x152.png?v=7',
  '/pwa-192x192.png?v=7',
  '/pwa-384x384.png?v=7',
  '/pwa-512x512.png?v=7',
  '/maskable-icon-192x192.png?v=7',
  '/maskable-icon-512x512.png?v=7',
  '/apple-touch-icon.png?v=7',
  '/favicon.ico?v=7',
  '/favicon-32x32.png?v=7',
  '/favicon-16x16.png?v=7',
  '/pwa-icon.svg?v=7',
  '/icon-192.png?v=7',
  '/icon-512.png?v=7'
];

// Install Event - Pre-cache icons & assets immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline assets v7');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[Service Worker] Caching warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clear all old legacy caches completely
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting outdated cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network-first with fallback to cache)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Network-first policy for manifest and icon requests so updates are picked up instantly
  const url = new URL(event.request.url);
  const isManifestOrIcon = url.pathname.includes('manifest') || url.pathname.endsWith('.png') || url.pathname.endsWith('.ico') || url.pathname.endsWith('.svg');

  if (isManifestOrIcon) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
        });
      })
  );
});
