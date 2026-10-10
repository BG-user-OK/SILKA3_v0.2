// SIŁKA 3 — Service Worker
const CACHE_NAME = 'silka3-vGPT_1.8.0';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css?v=vGPT_1.8.0',
  './app.js?v=vGPT_1.8.0',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './Photos/Bateria.png',
  './Photos/8.jpg?v=vGPT_1.8.0',
  './Photos/11.jpg?v=vGPT_1.8.0',
  './Photos/14.jpg?v=vGPT_1.8.0',
  './Photos/16.jpg?v=vGPT_1.8.0',
  './Photos/17.jpg?v=vGPT_1.8.0',
  './Photos/18.jpg?v=vGPT_1.8.0',
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
      Promise.all(keys.filter(k => k.startsWith('silka3-') && k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first, z fallbackiem do sieci; po pobraniu z sieci aktualizacja cache
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Integracje i prywatne odpowiedzi omijają CacheStorage, także przy no-store.
  if (url.origin !== self.location.origin ||
      !url.pathname.startsWith(new URL(self.registration.scope).pathname) ||
      req.cache === 'no-store') return;

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
      }).catch(() => req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
    })
  );
});
