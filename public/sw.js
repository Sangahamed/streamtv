// v2 : la v1 mettait TOUT en cache « cache-first », y compris les réponses
// d'API (matchs, flux) et les playlists HLS d'autres domaines : une fois en
// cache, un direct restait figé sur une ancienne playlist et les données
// n'étaient plus jamais rafraîchies. Désormais seuls les fichiers statiques
// versionnés sont servis depuis le cache.
const CACHE_NAME = 'streamtv-v2';
const STATIC_ASSETS = ['/offline.html', '/icon-192.png', '/icon-512.png', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

function isCacheableStatic(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/_next/static/') || STATIC_ASSETS.includes(url.pathname))
  );
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  // Pages : réseau d'abord, page hors ligne en secours.
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }

  const url = new URL(request.url);
  // Tout le reste (API, flux vidéo, logos, autres domaines) passe directement
  // par le réseau, sans interception.
  if (!isCacheableStatic(url)) return;

  e.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
    )
  );
});
