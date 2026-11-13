// Minimaler Service Worker – nötig, damit Android „Zum Startbildschirm hinzufügen“ anbietet
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
