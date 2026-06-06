import Dexie, { type Table } from "dexie";
import type { Protocol, CachedAudio } from "../types/guardian";

export interface QueuedSOS {
  localId?: number;
  type: string;
  description: string;
  location: { lat: number; lng: number };
  timestamp: string;
  userId: string;
  userName: string;
  photos: Blob[];
  audioBlobs?: Blob[];
  status: "pending" | "syncing" | "failed" | "synced" | "dead";
  attempts: number;
  lastError?: string;
  clientUuid: string;
  smsFallback?: boolean;
  nextAttemptAt?: number;
  lockedAt?: number;
  createdAt?: number;
}

export interface SyncedReport {
  id: string;
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
  status: "pending" | "syncing" | "synced" | "failed";
  attempts?: number;
  nextAttemptAt?: number;
  lastError?: string;
}

export interface AIChatMessage {
  id?: number;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface QueuedAction {
  id?: number;
  type:
    | "sos"
    | "location"
    | "status_update"
    | "activity_log"
    | "update_role"
    | "update_status"
    | "revoke_access"
    | "add_note";
  payload: any;
  timestamp: number;
  retryCount: number;
  nextAttemptAt?: number;
  status?: "pending" | "syncing" | "failed" | "dead";
  lastError?: string;
  clientUuid?: string;
}

export class SOSDatabase extends Dexie {
  outbox!: Table<QueuedSOS>;
  // ... (rest of class)
  synced!: Table<SyncedReport>;
  pendingLocations!: Table<PendingLocation>;
  aiChatHistory!: Table<AIChatMessage>;
  protocols!: Table<Protocol>;
  audioCache!: Table<CachedAudio>;
  queuedActions!: Table<QueuedAction>;

  constructor() {
    super("BrgyTanodSOS_DB");

    // ── v1–v7 (existing) ────────────────────────────────────────────────
    this.version(1).stores({ outbox: "++localId, status, userId, timestamp" });
    this.version(2).stores({
      outbox: "++localId, status, userId, timestamp, [userId+timestamp], [status+timestamp]",
    });
    this.version(3)
      .stores({
        outbox: "++localId, status, userId, timestamp, clientUuid, [userId+timestamp], [status+timestamp]",
        synced: "id, localId, userId, syncedAt",
      })
      .upgrade(async (trans) =>
        trans.table("outbox").toCollection().modify((r) => {
          if (!r.clientUuid) r.clientUuid = crypto.randomUUID();
        })
      );
    this.version(4).stores({
      outbox: "++localId, status, userId, timestamp, clientUuid, [userId+timestamp], [status+timestamp]",
      synced: "id, localId, userId, syncedAt",
      pendingLocations: "id, userId, timestamp, status",
    });
    this.version(5).stores({
      outbox: "++localId, status, userId, timestamp, clientUuid, [userId+timestamp], [status+timestamp]",
      synced: "id, localId, userId, syncedAt",
      pendingLocations: "id, userId, timestamp, status",
      aiChatHistory: "++id, sessionId, timestamp",
    });
    this.version(6).stores({
      outbox: "++localId, status, userId, timestamp, clientUuid, [userId+timestamp], [status+timestamp]",
      synced: "id, localId, userId, syncedAt",
      pendingLocations: "id, userId, timestamp, status",
      aiChatHistory: "++id, sessionId, timestamp",
      protocols: "id, type, keywords",
      audioCache: "key, timestamp",
    });
    this.version(7).stores({
      outbox: "++localId, status, userId, timestamp, clientUuid, [userId+timestamp], [status+timestamp]",
      synced: "id, localId, userId, syncedAt",
      pendingLocations: "id, userId, timestamp, status",
      aiChatHistory: "++id, sessionId, timestamp",
      protocols: "id, type, keywords",
      audioCache: "key, timestamp",
      queuedActions: "++id, type, timestamp, retryCount",
    });

    // ── v8: backoff + lease + dead-letter (NEW) ─────────────────────────
    this.version(8)
      .stores({
        outbox:
          "++localId, status, userId, timestamp, clientUuid, nextAttemptAt, " +
          "[userId+timestamp], [status+timestamp], [status+nextAttemptAt]",
        synced: "id, localId, userId, syncedAt",
        pendingLocations:
          "id, userId, timestamp, status, nextAttemptAt, [status+nextAttemptAt]",
        aiChatHistory: "++id, sessionId, timestamp",
        protocols: "id, type, keywords",
        audioCache: "key, timestamp",
        queuedActions:
          "++id, type, timestamp, retryCount, status, nextAttemptAt, clientUuid, " +
          "[status+nextAttemptAt]",
      })
      .upgrade(async (trans) => {
        const now = Date.now();
        await trans.table("outbox").toCollection().modify((r: any) => {
          if (r.nextAttemptAt == null) r.nextAttemptAt = now;
          if (r.createdAt == null) r.createdAt = new Date(r.timestamp).getTime() || now;
          if (r.status === "syncing") r.status = "pending";
        });
        await trans.table("pendingLocations").toCollection().modify((l: any) => {
          if (l.nextAttemptAt == null) l.nextAttemptAt = now;
          if (l.attempts == null) l.attempts = 0;
        });
        await trans.table("queuedActions").toCollection().modify((q: any) => {
          if (q.status == null) q.status = "pending";
          if (q.nextAttemptAt == null) q.nextAttemptAt = now;
        });
      });
  }
}

// Fallback mock database for incognito / restricted environments
class MockSOSDatabase {
  outbox = {
    add: async () => 1,
    where: () => ({ anyOf: () => ({ toArray: async () => [] }) }),
    update: async () => 1,
    delete: async () => 1,
  };
  synced = {
    add: async () => 1,
  };
  pendingLocations = {
    add: async () => 1,
    where: () => ({ equals: () => ({ toArray: async () => [] }) }),
    update: async () => 1,
    delete: async () => 1,
  };
  aiChatHistory = {
    add: async () => 1,
    where: () => ({
      equals: () => ({ sortBy: async () => [] }),
      anyOf: () => ({ toArray: async () => [] }),
    }),
    delete: async () => 1,
  };
  queuedActions = {
    add: async () => 1,
    where: () => ({ below: () => ({ delete: async () => 1 }) }),
    update: async () => 1,
    delete: async () => 1,
    orderBy: () => ({ toArray: async () => [] }),
  };
  transaction = async (mode: any, tables: any, cb: any) => await cb();
}

let safeDb: any;
try {
  safeDb = new SOSDatabase();
} catch (err) {
  console.warn(
    "IndexedDB restricted (likely Incognito mode). Offline features disabled."
  );
  safeDb = new MockSOSDatabase();
}

export const db = safeDb as SOSDatabase;

export const cleanupOldQueues = async () => {
  try {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    await db.queuedActions.where("timestamp").below(threeDaysAgo).delete();
  } catch (err) {
    console.warn("Could not cleanup old queues", err);
  }
};
