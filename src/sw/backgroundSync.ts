import { db } from '@/db/offlineDB';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db as firestoreDb } from '@/lib/firebase';

export const registerBackgroundSync = async () => {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('Background Sync not supported');
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  await (registration as any).sync.register('sync-queued-actions').catch((err: any) => {
    console.warn('Background sync registration failed:', err);
  });
};

export const processQueuedActions = async () => {
  const queued = await db.queuedActions.orderBy('timestamp').toArray();

  for (const item of queued) {
    try {
      if (item.type === 'sos') {
        // Process SOS
        await setDoc(doc(firestoreDb, 'alerts', item.payload.id), {
          ...item.payload,
          syncedAt: serverTimestamp(),
        });
      } else if (item.type === 'location') {
        // Process location update
        await updateDoc(doc(firestoreDb, 'tanods', item.payload.userId), {
          location: item.payload.location,
          lastUpdated: serverTimestamp(),
        });
      }

      // Success → Delete from queue
      if (item.id) await db.queuedActions.delete(item.id);
    } catch (error) {
      // Increment retry count
      if (item.id) {
        await db.queuedActions.update(item.id, {
          retryCount: (item.retryCount || 0) + 1
        });
      }
    }
  }
};
