import { useState, useEffect, useCallback, useRef } from 'react';
import { db, type QueuedSOS } from '../db/offlineDB';
import { offlineService } from '../services/offlineService';
import { photoService } from '../services/photoService';
import { useAuthStore } from '../store/useAuthStore';
import { useSOSStore } from '../store/useSOSStore';
import { toast } from 'react-hot-toast';

export function useOfflineSOS() {
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { profile } = useAuthStore();
  const { createSOS } = useSOSStore();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateCount = useCallback(async () => {
    const count = await db.outbox.where('status').anyOf(['pending', 'failed']).count();
    setQueuedCount(count);
  }, []);

  const forceSync = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;
    
    setIsSyncing(true);
    try {
      const result = await offlineService.syncPending(async (data) => {
        // We call the global store action for actual transmission
        return createSOS(data.type, data.description, data.location, data.photos);
      });

      if (result.success > 0) {
        toast.success(`Tactical Link Restored: ${result.success} reports synced.`, { icon: '📡' });
      }
      
      await updateCount();
    } catch (err) {
      console.error('[Offline] Manual sync failure:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, createSOS, updateCount]);

  useEffect(() => {
    updateCount();
    
    // Dexie Collection dynamic listener (using liveQuery would be better, but polling is safer for this environment)
    const interval = setInterval(updateCount, 10000);

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_TRIGGER') {
        forceSync();
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    window.addEventListener('online', forceSync);

    return () => {
      clearInterval(interval);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
      window.removeEventListener('online', forceSync);
    };
  }, [updateCount, forceSync]);

  const handleQueueSOS = async (type: string, description: string, location: { lat: number, lng: number }, rawPhotos: (File | string)[] = []) => {
    if (!profile) return toast.error('Tactical Identity Required.');

    try {
      // Compress each photo into a Blob before storage
      const photoBlobs = await Promise.all(
        rawPhotos.map(p => photoService.compressForSOS(p))
      );

      await offlineService.queueSOS({
        type,
        description,
        location,
        timestamp: new Date().toISOString(),
        userId: profile.id,
        userName: profile.name || 'Citizen',
        photos: photoBlobs
      });

      await updateCount();
      return true;
    } catch (err) {
      console.error('[Offline] Storage failure:', err);
      toast.error('Tactical Outbox Write Failed.');
      return false;
    }
  };

  return {
    queuedCount,
    handleQueueSOS,
    forceSync,
    isSyncing
  };
}
