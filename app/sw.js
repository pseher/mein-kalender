// Mein Kalender – Service Worker: App startet auch ohne Netz, Updates kommen trotzdem sofort
const V = "mk-20261116052830";
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

// ---- Benachrichtigungen ----
self.addEventListener("push", e => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch { m = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(m.title || "Mein Kalender", { body: m.body || "", tag: m.tag || undefined, renotify: !!m.tag,
    icon: "/icon-192.png", badge: "/icon-192.png", data: { url: m.url || "/app/", route: m.route || "" }, actions: m.route ? [{ action: "route", title: "🧭 Route" }] : [] }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close(); const d = e.notification.data || {};
  if (e.action === "route" && d.route) { e.waitUntil(clients.openWindow(d.route)); return; }
  const url = new URL(d.url || "/app/", self.location.origin).href;
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => { const w = ws.find(x => x.url.includes("/app/")); if (w) return w.focus(); return clients.openWindow(url); }));
});
