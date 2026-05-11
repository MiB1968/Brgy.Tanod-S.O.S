const CACHE_NAME = 'tanod-sos-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

importScripts('https://unpkg.com/dexie@4.4.2/dist/dexie.js');

const db = new Dexie('BrgyTanodSOS_DB');
db.version(1).stores({
  outbox: '++id, status, userId, timestamp',
  logs: '++id, event, timestamp'
});
db.version(2).stores({
  outbox: '++id, status, userId, timestamp, [userId+timestamp], [status+timestamp]',
});
db.version(3).stores({
  outbox: '++localId, status, userId, timestamp, clientUuid, [userId+timestamp], [status+timestamp]',
  synced: 'id, localId, userId, syncedAt'
});

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker.
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key.startsWith('tanod-sos')) {
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim()) // Claim clients immediately
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Always skip API calls and Socket.IO requests
  if (e.request.url.includes('/api/') || e.request.url.includes('/socket.io/')) return;

  // Use Network First strategy so users always get the latest code.
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // If we get a valid response, maybe update cache for URL
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // don't cache chrome-extension or other unsupported schemes
          if(e.request.url.startsWith('http')){
             cache.put(e.request, responseClone);
          }
        });
        return response;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sos-sync') {
    console.log('[SW] Tactical Background Sync triggered');
    event.waitUntil(notifyClients());
  }
});

async function notifyClients() {
  const pending = await db.outbox.where('status').anyOf(['pending', 'failed']).count();
  if (pending === 0) return;

  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({
      type: 'SYNC_TRIGGER',
      count: pending
    });
  }
}

