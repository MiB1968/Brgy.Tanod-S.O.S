import Dexie, { type Table } from 'dexie';

export interface QueuedSOS {
  localId?: number; // Auto-incrementing primary key
  type: string;
  description: string;
  location: { lat: number; lng: number };
  timestamp: string; // ISO String
  userId: string;
  userName: string;
  photos: Blob[]; // Stored as efficient binaries
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  attempts: number;
  lastError?: string;
  clientUuid: string; // Used for deduplication on server
  smsFallback?: boolean;
}

export interface SyncedReport {
  id: string; // Server ID
  localId: number;
  syncedAt: string;
  type: string;
  userId: string;
}

export interface PendingLocation {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  timestamp: string;
  accuracy?: number;
  speed?: number;
  heading?: number;
  status: 'pending' | 'synced';
}

export class SOSDatabase extends Dexie {
  outbox!: Table<QueuedSOS>;
  synced!: Table<SyncedReport>;
  pendingLocations!: Table<PendingLocation>;

  constructor() {
    super('BrgyTanodSOS_DB');

    // SCHEMA VERSION 1
    this.version(1).stores({
      outbox: '++localId, status, userId, timestamp',
    });

    // SCHEMA VERSION 2: Added compound indexes for fast history lookups
    this.version(2).stores({
      outbox: '++localId, status, userId, timestamp, [userId+timestamp], [status+timestamp]',
    });

    // SCHEMA VERSION 3: Synced History & Data Integrity
    this.version(3).stores({
      outbox: '++localId, status, userId, timestamp, clientUuid, [userId+timestamp], [status+timestamp]',
      synced: 'id, localId, userId, syncedAt'
    }).upgrade(async trans => {
      // DATA MIGRATION: Ensure all existing records have a clientUuid
      return trans.table('outbox').toCollection().modify(report => {
        if (!report.clientUuid) report.clientUuid = crypto.randomUUID();
      });
    });

    // SCHEMA VERSION 4: Pending GPS locations for batch synchronizer & offline logs
    this.version(4).stores({
      outbox: '++localId, status, userId, timestamp, clientUuid, [userId+timestamp], [status+timestamp]',
      synced: 'id, localId, userId, syncedAt',
      pendingLocations: 'id, userId, timestamp, status'
    });
  }
}

// Fallback mock database for incognito / restricted environments
class MockSOSDatabase {
  outbox = {
    add: async () => 1,
    where: () => ({ anyOf: () => ({ toArray: async () => [] }) }),
    update: async () => 1,
    delete: async () => 1
  };
  synced = {
    add: async () => 1
  };
  pendingLocations = {
    add: async () => 1,
    where: () => ({ equals: () => ({ toArray: async () => [] }) }),
    update: async () => 1,
    delete: async () => 1
  };
  transaction = async (mode: any, tables: any, cb: any) => await cb();
}

let safeDb: any;
try {
  safeDb = new SOSDatabase();
} catch (err) {
  console.warn("IndexedDB restricted (likely Incognito mode). Offline features disabled.");
  safeDb = new MockSOSDatabase();
}

export const db = safeDb as SOSDatabase;
