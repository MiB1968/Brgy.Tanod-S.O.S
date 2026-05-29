// src/sw/backgroundSync.ts
export const registerBackgroundSync = () => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((registration) => {
      // Sync queued SOS and locations
      (registration as any).sync.register('sync-queued-actions').catch((err: any) => {
        console.warn('Background sync registration failed:', err);
      });
    });
  }
};
