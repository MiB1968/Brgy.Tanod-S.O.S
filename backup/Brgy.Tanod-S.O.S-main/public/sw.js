// Brgy Tanod SOS Service Worker - Minimal Debug Version
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Pass through all
  if (e.request.url.includes('/api/')) return;
  e.respondWith(fetch(e.request));
});
