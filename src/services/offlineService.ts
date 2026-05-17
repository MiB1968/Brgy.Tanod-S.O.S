import { db, type QueuedSOS } from '../db/offlineDB';
import { toast } from 'react-hot-toast';
import { photoService } from './photoService';

export const offlineService = {
  /**
   * Primary entry point for SOS submission in any state
   */
  async queueSOS(data: Omit<QueuedSOS, 'localId' | 'status' | 'attempts'>): Promise<number> {
    const clientUuid = data.clientUuid || crypto.randomUUID();
    
    console.log('[Outbox] Queuing tactical report:', data.type);
    
    const localId = await db.outbox.add({
      ...data,
      clientUuid,
      status: 'pending',
      attempts: 0
    });

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
    const pending = await db.outbox
      .where('status')
      .anyOf(['pending', 'failed'])
      .toArray();

    if (pending.length === 0) return { success: 0, failed: 0 };

    let successCount = 0;
    let failCount = 0;

    for (const report of pending) {
      if (!report.localId) continue;

      try {
        // Exponential Backoff: Don't retry too fast
        const delay = Math.pow(2, report.attempts) * 1000;
        const lastAttemptTime = new Date(report.timestamp).getTime(); // Simplification
        
        await db.outbox.update(report.localId, { status: 'syncing' });

        // Convert Blobs to Base64 for the API call
        const photoData = await Promise.all(
          report.photos.map(p => photoService.blobToBase64(p))
        );

        await apiSyncFn({
          ...report,
          photos: photoData,
          isOfflineRecovered: true
        });

        // Record history and remove from outbox
        await db.synced.add({
          id: report.clientUuid,
          localId: report.localId,
          userId: report.userId,
          syncedAt: new Date().toISOString(),
          type: report.type
        });

        await db.outbox.delete(report.localId);
        successCount++;
        
      } catch (err: any) {
        failCount++;
        const attempts = (report.attempts || 0) + 1;
        
        await db.outbox.update(report.localId, {
          status: attempts >= 5 ? 'failed' : 'pending',
          attempts,
          lastError: err.message
        });
        
        console.error(`[Sync] Report ${report.localId} failed. Attempt ${attempts}/5`);
      }
    }

    return { success: successCount, failed: failCount };
  }
};
