const STATIC_CACHE_NAME = 'arearnzone-static-v8';
const DYNAMIC_IMAGE_CACHE_NAME = 'arearnzone-dynamic-images-v1';
const MAX_IMAGE_CACHE_ITEMS = 200;

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json?v=8',
  '/manifest.webmanifest?v=8',
  '/pwa-72x72.png?v=8',
  '/pwa-96x96.png?v=8',
  '/pwa-128x128.png?v=8',
  '/pwa-144x144.png?v=8',
  '/pwa-152x152.png?v=8',
  '/pwa-192x192.png?v=8',
  '/pwa-384x384.png?v=8',
  '/pwa-512x512.png?v=8',
  '/maskable-icon-192x192.png?v=8',
  '/maskable-icon-512x512.png?v=8',
  '/apple-touch-icon.png?v=8',
  '/favicon.ico?v=8',
  '/favicon-32x32.png?v=8',
  '/favicon-16x16.png?v=8',
  '/pwa-icon.svg?v=8',
  '/icon-192.png?v=8',
  '/icon-512.png?v=8'
];

// Helper to limit cache size (LRU eviction)
async function limitCacheSize(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      limitCacheSize(cacheName, maxItems);
    }
  } catch (err) {
    console.warn('[Service Worker] Cache limit cleanup error:', err);
  }
}

// Helper to identify image requests (local or external dynamic assets)
function isImageRequest(request, url) {
  if (request.destination === 'image') return true;
  const path = url.pathname.toLowerCase();
  if (path.match(/\.(png|jpg|jpeg|webp|gif|svg|avif|ico)(\?.*)?$/i)) return true;
  const host = url.hostname.toLowerCase();
  if (
    host.includes('googleusercontent.com') ||
    host.includes('unsplash.com') ||
    host.includes('firebasestorage.googleapis.com') ||
    host.includes('imgur.com') ||
    host.includes('cloudinary.com') ||
    host.includes('postimg') ||
    host.includes('fbcdn.net') ||
    host.includes('twimg.com')
  ) {
    return true;
  }
  return false;
}

// Install Event - Pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core assets v8');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[Service Worker] Caching warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clear outdated legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== STATIC_CACHE_NAME && cache !== DYNAMIC_IMAGE_CACHE_NAME) {
            console.log('[Service Worker] Deleting outdated cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Smart Caching Strategy for App & Dynamic Assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const request = event.request;
  const url = new URL(request.url);

  // 1. Dynamic Images, Task Thumbnails & Profile Photos Caching Strategy (Cache-First + Stale-While-Revalidate)
  if (isImageRequest(request, url)) {
    event.respondWith(
      caches.open(DYNAMIC_IMAGE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        // Fetch fresh copy in background to revalidate
        const networkFetchPromise = fetch(request, { mode: 'cors', credentials: 'omit' })
          .catch(() => fetch(request))
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              cache.put(request, networkResponse.clone());
              limitCacheSize(DYNAMIC_IMAGE_CACHE_NAME, MAX_IMAGE_CACHE_ITEMS);
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('[Service Worker] Dynamic image fetch warning:', url.href, err);
            return null;
          });

        // Instant return from cache if available
        if (cachedResponse) {
          event.waitUntil(networkFetchPromise);
          return cachedResponse;
        }

        // Wait for network if not in cache
        const freshResponse = await networkFetchPromise;
        if (freshResponse) {
          return freshResponse;
        }

        // Fallback inline SVG placeholder if offline & not cached
        return new Response(
          '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
          { headers: { 'Content-Type': 'image/svg+xml' } }
        );
      })
    );
    return;
  }

  // Only handle same-origin requests for application HTML/JS/CSS assets
  if (!url.origin.startsWith(self.location.origin)) {
    return;
  }

  // 2. Network-first policy for manifest & icons
  const isManifestOrIcon = url.pathname.includes('manifest') || url.pathname.endsWith('.png') || url.pathname.endsWith('.ico') || url.pathname.endsWith('.svg');

  if (isManifestOrIcon) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 3. Stale-While-Revalidate for application assets / HTML
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
        });
      })
  );
});
