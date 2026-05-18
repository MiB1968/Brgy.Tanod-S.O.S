const CACHE_NAME = 'tanod-sos-v6'; // bumped so stale double-cached model chunks are evicted
const SUPER_CACHE_NAME = 'supertonic-models-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

const SUPERTONIC_MODELS = [
  '/models/supertonic/model.onnx',
];

// ── Bug 4 Fix: domains/patterns to never cache ───────────────────────────────
// These are the CDN hosts WebLLM uses to stream model weights.
// We let them pass straight through to the network — WebLLM handles its own
// caching via IndexedDB (via its internal cache manager).
const PASSTHROUGH_PATTERNS = [
  'huggingface.co',
  'cdn-lfs.huggingface.co',
  'cdn-lfs-us-1.huggingface.co',
  'mlc.ai',
  'raw.githubusercontent.com/mlc-ai',
];

function isWebLLMRequest(url) {
  return PASSTHROUGH_PATTERNS.some((pattern) => url.includes(pattern));
}

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
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    // NOTE: Supertonic models are intentionally NOT cached automatically on install.
    // They are 300-500MB and will be cached via an opt-in "Offline Voice Pack" download flow.
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        // Delete any old tanod-sos cache versions (including v5 which had the
        // double-caching bug — removing it evicts the stale model chunks).
        if (key !== CACHE_NAME && key.startsWith('tanod-sos')) {
          console.log('[SW] Evicting old cache:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Always skip API calls and Socket.IO requests
  if (e.request.url.includes('/api/') || e.request.url.includes('/socket.io/')) return;

  // ── Bug 4 Fix ─────────────────────────────────────────────────────────────
  // Pass WebLLM/HuggingFace model requests straight to the network.
  // Never cache them — WebLLM manages its own persistent cache in IndexedDB.
  if (isWebLLMRequest(e.request.url)) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Use Network First strategy so users always get the latest code.
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (e.request.url.startsWith('http')) {
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
