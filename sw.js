// Prowl service worker — makes the app installable + usable offline.
// Design goals:
//  - Never serve a stale PAGE: navigations are network-first (falls back to
//    cached index.html only when offline), so deploys always show up.
//  - Fast assets: same-origin static files use stale-while-revalidate.
//  - Never touch Supabase, map tiles, or other cross-origin calls (pass through).
const CACHE = "prowl-v1";
const CORE = [
  "./", "./index.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(CORE.map((u) => c.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                 // never cache writes
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // Supabase, tiles, unpkg: passthrough

  // Page loads: network-first so a new deploy is never hidden by the cache.
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const c = await caches.open(CACHE);
        c.put("./index.html", net.clone());
        return net;
      } catch {
        return (await caches.match("./index.html")) || (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const cached = await c.match(req);
    const net = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === "basic") c.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await net) || Response.error();
  })());
});
