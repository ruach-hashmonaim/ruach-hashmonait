const CACHE_NAME = 'ruach-v51';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap'
];

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('SW: Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Listen for skip waiting message from page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch — NEVER intercept API calls; cache only static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // === CRITICAL: Let ALL API/Firebase/Google requests pass through untouched ===
  // Do NOT call event.respondWith() for these — the browser handles them directly
  if (url.hostname.includes('firestore') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('identitytoolkit') ||
      url.hostname.includes('securetoken') ||
      url.hostname.includes('google.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('generativelanguage') ||
      url.hostname.includes('anthropic') ||
      url.hostname.includes('cloudflare') ||
      url.hostname.includes('nominatim') ||
      url.hostname.includes('openstreetmap') ||
      url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('amudanan') ||
      url.hostname.includes('overpass-api') ||
      url.protocol === 'chrome-extension:') {
    return; // Let browser handle natively — no SW interference
  }

  // Network-first for HTML pages (index.html) — always get fresh content
  if (event.request.mode === 'navigate' || event.request.destination === 'document' ||
      url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '') {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // For other static assets (CSS, images, local JS) — stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetching = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetching;
    })
  );
});
