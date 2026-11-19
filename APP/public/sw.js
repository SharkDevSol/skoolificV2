// Self-clearing Service Worker to ensure fresh updates
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      // Tell open tabs a new version is ready — but do NOT navigate them here:
      // a student may be in the middle of an exam and a forced reload would
      // wipe their answers and restart the timer. The app decides when to reload.
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          if (client.postMessage) client.postMessage({ type: 'SW_UPDATED' });
        });
      });
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Always fetch fresh HTML/documents directly from the network
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
});
