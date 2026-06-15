/* Service worker — network-first for same-origin app files.
   Online: always fresh files (important since updates are uploaded often).
   Offline: serves the last-cached version.
   Firebase / CDN (cross-origin) requests are NOT touched — they handle
   their own offline cache (IndexedDB). */
const CACHE = 'mh-cache-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return; // skip Firebase/gstatic/etc.
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req))
  );
});
