// (GC 0.91) The game as an app you can install from the browser (Edge, Chrome: "Install"), and play without a connection once
// it has been opened: the pages and the code are fetched fresh when there is a connection and kept for when there is not;
// pictures, models and sounds are kept the first time they are fetched. Not used when the game is served from this
// computer (PLAY.bat / INSTALL.bat), which has everything already.
const CACHE = 'gc-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  const asset = /\/assets\//.test(r.url);
  e.respondWith(caches.open(CACHE).then(async (c) => {
    if (asset) { const hit = await c.match(r); if (hit) return hit; const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res; }
    try { const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res; } catch (err) { const hit = await c.match(r); if (hit) return hit; throw err; }
  }));
});
