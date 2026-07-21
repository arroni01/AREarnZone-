const CACHE_NAME = 'arearnzone-cache-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.css',
  './manifest.json',
  './manifest.webmanifest',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './maskable-icon-192x192.png',
  './maskable-icon-512x512.png',
  './apple-touch-icon.png',
  './favicon.ico',
  './favicon-32x32.png',
  './pwa-icon.svg',
  './icon-192.png',
  './icon-512.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[Service Worker] Failed to cache some assets during install:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network-first falling back to cache strategy)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip browser extensions or non-http requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If valid response, clone and save in cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try to return from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback if index.html is requested but offline
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });
      })
  );
});
