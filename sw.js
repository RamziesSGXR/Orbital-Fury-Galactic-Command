// (GC 0.91) The game as an app you can install from the browser (Edge, Chrome: "Install"), and play without a connection once
// it has been opened: the pages and the code are fetched fresh when there is a connection and kept for when there is not;
// pictures, models and sounds are kept the first time they are fetched. Not used when the game is served from this
// computer (PLAY.bat / INSTALL.bat), which has everything already.
// (0.92.5) a store of its own for each version of the game (the page registers this with ?v=<version>), and the older
// ones thrown away: a new version's pictures and models are never the last version's kept ones
const CACHE = 'gc-' + (new URL(self.location).searchParams.get('v') || '0');
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  const asset = /\/assets\//.test(r.url);
  e.respondWith(caches.open(CACHE).then(async (c) => {
    if (asset) { const hit = await c.match(r); if (hit) return hit; const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res; }
    try { const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res; } catch (err) { const hit = await c.match(r); if (hit) return hit; throw err; }
  }));
});
