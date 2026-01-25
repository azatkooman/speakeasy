
const CACHE_NAME = 'speakeasy-v1';

// Assets that must be cached immediately
const PRECACHE_URLS = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  // We can't easily list all esm.sh dependencies here because they are dynamic imports,
  // but the runtime caching will catch them.
];

// Domains that should be cached aggressively (Cache First)
const CACHE_DOMAINS = [
  'esm.sh',
  'unpkg.com',
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn-icons-png.flaticon.com' // Icon used in manifest
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignore API calls (ARASAAC search, Gemini, etc.)
  if (url.pathname.includes('/api/') || url.hostname.includes('arasaac.org') || url.hostname.includes('generativelanguage.googleapis.com')) {
    return; // Network only
  }

  // 2. Cache First Strategy for External Libraries/Styles/Fonts
  if (CACHE_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        }).catch(() => {
            // Offline fallback for images if needed, or just fail
            return new Response('', { status: 408, statusText: 'Request timed out' });
        });
      })
    );
    return;
  }

  // 3. Stale-While-Revalidate for App Shell (local files)
  // This ensures the user sees the latest version eventually, but loads instantly offline.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      }).catch((e) => {
          // Network failed
          console.log('Offline: ', e);
      });

      return cachedResponse || fetchPromise;
    })
  );
});
