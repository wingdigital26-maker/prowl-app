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

// ===== Web Push =====
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "What's the Move?", {
    body: d.body || "",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: { url: d.url || "./" },
    vibrate: [60, 30, 60],
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) { if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});
