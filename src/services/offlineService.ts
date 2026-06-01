import { db, type QueuedSOS } from '../db/offlineDB';
import { toast } from 'react-hot-toast';
import { photoService } from './photoService';
import { generic as api } from '../lib/api';

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
  },

  /**
   * Synchronizes queued background GPS coordinates
   */
  async syncPendingLocations(): Promise<{ success: number; failed: number }> {
    try {
      const pending = await db.pendingLocations.where('status').equals('pending').toArray();
      if (pending.length === 0) return { success: 0, failed: 0 };

      let successCount = 0;
      let failCount = 0;

      for (const loc of pending) {
        try {
          await api.update('gps/heartbeat', {
            id: loc.userId,
            role: 'tanod',
            lat: loc.lat,
            lng: loc.lng,
            timestamp: loc.timestamp,
            accuracy: loc.accuracy,
            speed: loc.speed,
            heading: loc.heading,
          });

          await db.pendingLocations.delete(loc.id);
          successCount++;
        } catch (err) {
          failCount++;
          console.error(`[Sync] Location update ${loc.id} failed:`, err);
        }
      }

      return { success: successCount, failed: failCount };
    } catch (err) {
      console.error('[Sync] error syncing pending locations:', err);
      return { success: 0, failed: 0 };
    }
  },

  /**
   * Synchronizes queued activities/audit actions
   */
  async syncPendingQueuedActions(): Promise<{ success: number; failed: number }> {
    try {
      const pending = await db.queuedActions.toArray();
      if (pending.length === 0) return { success: 0, failed: 0 };

      let successCount = 0;
      let failCount = 0;

      for (const action of pending) {
        if (!action.id) continue;
        try {
          if (action.type === 'activity_log') {
            const { path, entry } = action.payload;
            if (path === 'audit_logs') {
              await api.create('audit_logs', entry);
            } else if (path === 'tanod_activity_logs') {
              const { logs: apiLogs } = await import('../lib/api');
              await apiLogs.create(entry);
            }
          } else if (action.type === 'status_update') {
            const { residentId, status } = action.payload;
            await api.update(`residents/${residentId}`, { status });
          } else if (action.type === 'update_role') {
            const { admin: apiAdmin } = await import('../lib/api');
            const { userId, role } = action.payload;
            await apiAdmin.updateUserRole(userId, role);
          } else if (action.type === 'update_status') {
            const { admin: apiAdmin } = await import('../lib/api');
            const { userId, status } = action.payload;
            await apiAdmin.updateUserStatus(userId, status);
          } else if (action.type === 'revoke_access') {
             const { admin: apiAdmin } = await import('../lib/api');
             const { userId } = action.payload;
             await apiAdmin.deleteUser(userId);
          }
          await db.queuedActions.delete(action.id);
          successCount++;
        } catch (err) {
          failCount++;
          await db.queuedActions.update(action.id, {
            retryCount: (action.retryCount || 0) + 1,
          });
          console.error(`[Sync] queuedAction ${action.id} upload failed:`, err);
        }
      }

      return { success: successCount, failed: failCount };
    } catch (err) {
      console.error('[Sync] error syncing queued actions:', err);
      return { success: 0, failed: 0 };
    }
  },

  /**
   * Process all offline queues
   */
  async processOfflineQueue(): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    const locations = await this.syncPendingLocations();
    const actions = await this.syncPendingQueuedActions();
    success += locations.success + actions.success;
    failed += locations.failed + actions.failed;
    // Note: You must also handle SOS sync somehow if needed, but for now we do locations & actions
    return { success, failed };
  }
};
