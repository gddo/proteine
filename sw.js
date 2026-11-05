const CACHE = 'proteine-v2';
const FILES = ['./', 'index.html', 'style.css', 'logic.js', 'app.js', 'manifest.webmanifest', 'vendor/bricolage.woff2', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Risponde subito dalla cache e aggiorna in background: le modifiche pubblicate arrivano all'apertura successiva.
  const update = fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; });
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => { update.catch(() => {}); return hit || update; }));
});
