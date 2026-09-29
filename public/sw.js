const CACHE_NAME = 'vcc-cache-v2';

const STATIC_ASSETS = [
  '/',
  '/compare',
  '/learn',
  '/settings',
  '/help',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => console.log('Failed to cache static assets during install', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't intercept cross-origin, non-GET, or app API requests (GitHub/Groq fetches must reach the network).
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Network-first for everything else
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return response;
      })
      .catch(async () => {
        const response = await caches.match(event.request);
        if (response) return response;
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          const defaultResponse = await caches.match('/');
          if (defaultResponse) return defaultResponse;
        }
        return new Response('Network error and not found in cache.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
  );
});
