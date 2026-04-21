const CACHE = 'dashboard-v3';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;900&display=swap',
  'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js'
];

// ── Install: cache app shell ──────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
      .catch(() => caches.open(CACHE).then(c => c.addAll(['./','./index.html'])))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Cache First → Network Fallback ────────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // GitHub API — دائماً من الشبكة (لا تخزين)
  if (url.includes('api.github.com')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response('{"error":"offline"}', {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // باقي الطلبات: Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
