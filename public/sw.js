const CACHE_NAME = 'brgy-tanod-v2';

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Do not intercept API calls to avoid corrupting Firestore/Supabase streams
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('firebase') || 
      url.hostname.includes('supabase.co') ||
      url.pathname.startsWith('/api')) {
    return;
  }

  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((response) => {
      if (response) return response;
      
      return fetch(e.request).catch(() => {
        // Only return index.html for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return null;
      });
    })
  );
});
