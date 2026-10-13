const STATIC_CACHE_NAME = 'kana-escape-static-v3';
const AUDIO_CACHE_NAME = 'kana-escape-audio-v3';
const MAX_AUDIO_ENTRIES = 60;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/Kaizen.svg',
  '/Kaizen.webp',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE_NAME && key !== AUDIO_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Trim audio cache to prevent runaway storage usage on mobile devices
async function trimAudioCache() {
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const keys = await cache.keys();
    if (keys.length > MAX_AUDIO_ENTRIES) {
      const itemsToDelete = keys.slice(0, keys.length - MAX_AUDIO_ENTRIES);
      await Promise.all(itemsToDelete.map((req) => cache.delete(req)));
    }
  } catch {
    // ignore
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and leaderboard backend API
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Audio assets: bounded LRU cache-first with network fallback
  const isAudio = url.pathname.startsWith('/audio/') || request.destination === 'audio';
  if (isAudio) {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            trimAudioCache();
          }
          return networkResponse;
        } catch {
          return new Response(null, { status: 404, statusText: 'Audio Not Found Offline' });
        }
      })
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images): Cache-first with network fallback
  if (
    url.pathname.startsWith('/assets/') ||
    url.origin.includes('fonts.googleapis.com') ||
    url.origin.includes('fonts.gstatic.com') ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return cached || new Response(null, { status: 503, statusText: 'Service Unavailable' });
        }
      })
    );
    return;
  }

  // HTML documents / navigations: Network-first with static cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html') || caches.match('/')))
  );
});
