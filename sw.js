const CACHE = 'liantong-exam-v1';
const CORE = ['./', './index.html', './styles.css', './app.js', './data.js', './manifest.webmanifest', './assets/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    try {
      const c = await caches.open(CACHE);
      await Promise.allSettled(CORE.map(u => c.add(u)));
    } catch (err) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    } catch (err) {}
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    try {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
    } catch (err) {}

    try {
      const res = await fetch(req);
      if (res && res.ok) {
        caches.open(CACHE).then(c => c.put(req, res.clone())).catch(() => {});
      }
      return res;
    } catch (err) {
      try {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      } catch (e) {}
      return new Response('当前处于离线状态，请联网后刷新重试。', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
