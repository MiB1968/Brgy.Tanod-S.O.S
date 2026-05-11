const CACHE_NAME = 'tanod-sos-v3';
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
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
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
