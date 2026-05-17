// src/db/offlineDB.ts
import Dexie, { Table } from 'dexie';

export interface OfflineSOS {
  id?: number;
  clientUuid: string;
  uploadSessionId?: string;

  userId: string;
  latitude: number;
  longitude: number;
  type: 'emergency' | 'medical' | 'fire' | 'crime' | 'other';
  priority: 'critical' | 'high' | 'normal';

  description?: string;
  address?: string;
  mediaUrls: string[];

  status: 'pending' | 'uploading' | 'sent' | 'failed';
  retryCount: number;
  nextRetryAt?: Date;
  lockedAt?: Date;           // For sync locking
  errorMessage?: string;

  syncVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfflineMedia {
  id?: number;
  clientUuid: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

class BrgyTanodSOS_DB extends Dexie {
  outbox!: Table<OfflineSOS, number>;
  mediaStore!: Table<OfflineMedia, number>;

  constructor() {
    super('BrgyTanodSOS_DB');

    this.version(4).stores({
      outbox: '++id, clientUuid, uploadSessionId, userId, status, priority, nextRetryAt, lockedAt, createdAt',
      mediaStore: '++id, clientUuid'
    });

  }

  // FIXED: Atomic lock acquisition
  async lockForSync(id: number, sessionId: string): Promise<boolean> {
    return this.transaction('rw', this.outbox, async () => {
      const item = await this.outbox.get(id);
      if (!item) return false;

      // Check for stale lock
      if (item.lockedAt) {
        const age = Date.now() - item.lockedAt.getTime();
        if (age < LOCK_TIMEOUT_MS) {
          return false; // Still locked by another process
        }
        // Stale lock → reclaim it
      }

      await this.outbox.update(id, {
        lockedAt: new Date(),
        uploadSessionId: sessionId,
        updatedAt: new Date()
      });

      return true;
    });
  }

  // Transactional cleanup
  async unlockAndMarkSent(id: number) {
    return this.transaction('rw', [this.outbox, this.mediaStore], async () => {
      const item = await this.outbox.get(id);
      if (!item) return;

      // Delete associated media
      await this.mediaStore.where('clientUuid').equals(item.clientUuid).delete();

      // Mark as sent and unlock
      await this.outbox.update(id, {
        status: 'sent',
        lockedAt: undefined,
        nextRetryAt: undefined,
        errorMessage: undefined,
        updatedAt: new Date()
      });
    });
  }

  async incrementRetry(id: number) {
    return this.transaction('rw', this.outbox, async () => {
      const item = await this.outbox.get(id);
      if (!item) return;

      const backoff = Math.min(300000, 15000 * Math.pow(1.8, item.retryCount));

      await this.outbox.update(id, {
        retryCount: item.retryCount + 1,
        nextRetryAt: new Date(Date.now() + backoff),
        status: 'failed',
        lockedAt: undefined,
        updatedAt: new Date()
      });
    });
  }

  async getPendingItems(limit = 8): Promise<OfflineSOS[]> {
    const now = new Date();
    const items = await this.outbox
      .where('status')
      .anyOf(['pending', 'failed'])
      .and(item => {
        if (item.lockedAt) {
          const age = Date.now() - item.lockedAt.getTime();
          return age > LOCK_TIMEOUT_MS; // include stale locks
        }
        return !item.nextRetryAt || item.nextRetryAt <= now;
      })
      .toArray();

    // Sort manually as priority is a string, and custom sort is easier
    const priorityMap = { critical: 3, high: 2, normal: 1 };
    return items.sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]).slice(0, limit);
  }

  async clearSuccessful() {
    return this.outbox.where('status').equals('sent').delete();
  }
}

export const offlineDB = new BrgyTanodSOS_DB();
export default offlineDB;
