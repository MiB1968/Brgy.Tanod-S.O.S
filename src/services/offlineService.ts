import { offlineDB, type OfflineSOS } from '../db/offlineDB';
import { photoService } from './photoService';

export const offlineService = {
  /**
   * Primary entry point for SOS submission in any state
   */
  async queueSOS(data: Omit<OfflineSOS, 'id' | 'clientUuid' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt' | 'syncVersion' | 'lockedAt' | 'nextRetryAt' | 'errorMessage' | 'uploadSessionId'>, photoBlobs: Blob[]): Promise<number> {
    const clientUuid = crypto.randomUUID();
    
    console.log('[Outbox] Queuing tactical report:', data.type);
    
    const localId = await offlineDB.outbox.add({
      ...data,
      clientUuid,
      status: 'pending',
      retryCount: 0,
      syncVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    for (let i = 0; i < photoBlobs.length; i++) {
        await offlineDB.mediaStore.add({
            clientUuid,
            blob: photoBlobs[i],
            fileName: `photo_${i}.jpg`,
            mimeType: 'image/jpeg',
            size: photoBlobs[i].size,
            createdAt: new Date()
        });
    }

    // Notify PWA Background Sync
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // @ts-ignore
        await registration.sync.register('sos-sync');
      } catch (err) {
        console.warn('[Sync] Background registration failed:', err);
      }
    }

    return localId;
  },

  /**
   * Synchronizes all queued reports using exponential backoff logic
   */
  async syncPending(apiSyncFn: (data: any) => Promise<any>): Promise<{ success: number; failed: number }> {
    const pending = await offlineDB.getPendingItems();

    if (pending.length === 0) return { success: 0, failed: 0 };

    let successCount = 0;
    let failCount = 0;

    const sessionId = crypto.randomUUID();

    for (const report of pending) {
      if (!report.id) continue;

      const locked = await offlineDB.lockForSync(report.id, sessionId);
      if (!locked) continue; // Skip if couldn't lock

      try {
        await offlineDB.outbox.update(report.id, { status: 'uploading' });

        const mediaItems = await offlineDB.mediaStore.where('clientUuid').equals(report.clientUuid).toArray();

        // Convert Blobs to Base64 for the API call
        const photoData = await Promise.all(
          mediaItems.map(p => photoService.blobToBase64(p.blob))
        );

        await apiSyncFn({
          type: report.type,
          description: report.description || '',
          location: { lat: report.latitude, lng: report.longitude },
          photos: photoData,
          isOfflineRecovered: true
        });

        await offlineDB.unlockAndMarkSent(report.id);
        successCount++;
        
      } catch (err: any) {
        failCount++;
        
        await offlineDB.incrementRetry(report.id);
        
        console.error(`[Sync] Report ${report.id} failed. Attempt ${report.retryCount + 1}`);
      }
    }

    // Optionally cleanup successful
    // await offlineDB.clearSuccessful();

    return { success: successCount, failed: failCount };
  }
};
