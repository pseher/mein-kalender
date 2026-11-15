// Mein Kalender – Service Worker: App startet auch ohne Netz, Updates kommen trotzdem sofort
const V = "mk-20261115073422";
const SHELL = ["/app/", "/app/supabase.js", "/app/591.supabase.js", "/icon-192.png", "/icon-512.png", "/app/manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  const own = u.origin === location.origin, fonts = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!own && !fonts) return;                                   // Supabase, Google, KI: nie zwischenspeichern
  if (r.mode === "navigate") {                                  // Seite: erst Netz (immer aktuell), sonst gespeicherte Version
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(x => x.put("/app/", c)); return res; }).catch(() => caches.match("/app/")));
    return;
  }
  e.respondWith(caches.match(r).then(hit => {                   // Dateien: sofort aus dem Speicher, im Hintergrund erneuern
    const net = fetch(r).then(res => { if (res.ok || res.type === "opaque") { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
