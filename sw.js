// SIŁKA 3 — Service Worker
const CACHE_NAME = 'silka3-v0.6.8';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@500;700;900&display=swap'
];

// Instalacja — prekeszowanie zasobów
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS.map(url => new Request(url, { cache: 'reload' })))
        .catch(err => {
          console.warn('[SW] Niektóre zasoby nie zostały scachowane:', err);
        });
    })
  );
  self.skipWaiting();
});

// Aktywacja — czyszczenie starych cache'ów
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first, z fallbackiem do sieci; po pobraniu z sieci aktualizacja cache
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        // W tle aktualizuj cache (stale-while-revalidate)
        fetch(req).then(fresh => {
          if (fresh && fresh.status === 200 && fresh.type !== 'opaque') {
            caches.open(CACHE_NAME).then(c => c.put(req, fresh.clone())).catch(()=>{});
          }
        }).catch(()=>{});
        return cached;
      }
      return fetch(req).then(fresh => {
        if (fresh && fresh.status === 200) {
          const clone = fresh.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(()=>{});
        }
        return fresh;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
