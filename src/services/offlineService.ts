import { db, type QueuedSOS, type PendingLocation } from '../db/offlineDB';
import { toast } from 'react-hot-toast';
import { photoService } from './photoService';
import { generic as api } from '../lib/api';
import { Capacitor } from '@capacitor/core';

const MAX_ATTEMPTS = 5;

const computeBackoff = (attempts: number) => Math.min(Math.pow(2, attempts) * 1000, 3600000); // Max 1hr

async function withSyncLock(name: string, fn: () => Promise<T>): Promise<T | null> {
  if (typeof navigator === "undefined" || !(navigator as any).locks) {
    return fn();
  }
  return await (navigator as any).locks.request(
    name,
    { ifAvailable: true },
    async (lock: any) => {
      if (!lock) return null;
      return fn();
    }
  );
}

export const offlineService = {
  async queueSOS(data: Omit<QueuedSOS, 'localId' | 'status' | 'attempts' | 'clientUuid'>): Promise<number> {
    const clientUuid = crypto.randomUUID();
    const now = Date.now();
    
    const localId = await db.outbox.add({
      ...data,
      clientUuid,
      status: 'pending',
      attempts: 0,
      createdAt: now,
      nextAttemptAt: now,
    } as QueuedSOS);

    if ("serviceWorker" in navigator && "SyncManager" in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // @ts-ignore
        await registration.sync.register("sos-sync");
      } catch (err) {
        console.warn("[Sync] Background registration failed:", err);
      }
    }

    return localId;
  },

  async syncPending(
    apiSyncFn: (data: any) => Promise<any>
  ): Promise<{ success: number; failed: number; skipped: number }> {
    const result = await withSyncLock("sos-outbox-sync", async () => {
      const now = Date.now();
      let success = 0, failed = 0, skipped = 0;

      const candidates: QueuedSOS[] = await db.outbox
        .where("status").anyOf(["pending", "failed"])
        .and((r) => (r.nextAttemptAt ?? 0) <= now)
        .toArray();

      for (const report of candidates) {
        if (!report.localId) continue;
        
        await db.outbox.update(report.localId, { status: "syncing", lockedAt: now });

        try {
          const photoData = await Promise.all(
            report.photos.map(p => photoService.blobToBase64(p))
          );
          const audioData = await Promise.all(
            (report.audioBlobs || []).map(a => photoService.blobToBase64(a))
          );

          await apiSyncFn({
            ...report,
            photos: photoData,
            audio: audioData,
            isOfflineRecovered: true,
          });

          await db.synced.add({
            id: report.clientUuid,
            localId: report.localId,
            userId: report.userId,
            syncedAt: new Date().toISOString(),
            type: report.type,
          });
          await db.outbox.delete(report.localId);
          success++;
        } catch (err: any) {
          const attempts = (report.attempts || 0) + 1;
          const isDead = attempts >= MAX_ATTEMPTS;
          await db.outbox.update(report.localId, {
            status: isDead ? "dead" : "failed",
            attempts,
            lastError: String(err?.message || err).slice(0, 500),
            lockedAt: undefined,
            nextAttemptAt: Date.now() + computeBackoff(attempts),
          });
          failed++;
        }
      }
      return { success, failed, skipped };
    });

    return result ?? { success: 0, failed: 0, skipped: 0 };
  },

  async queueLocation(loc: Omit<PendingLocation, 'id' | 'status' | 'attempts' | 'nextAttemptAt'>) {
    const now = Date.now();
    await db.pendingLocations.put({
      ...loc,
      status: "pending",
      attempts: 0,
      nextAttemptAt: now,
    } as PendingLocation);
  },

  async syncPendingLocations(): Promise<{ success: number; failed: number }> {
    const result = await withSyncLock("location-sync", async () => {
      const now = Date.now();
      let success = 0, failed = 0;

      const due: PendingLocation[] = await db.pendingLocations
        .where("status").equals("pending")
        .and((l: any) => (l.nextAttemptAt ?? 0) <= now)
        .toArray();

      for (const loc of due) {
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
          success++;
        } catch (err: any) {
          const attempts = (loc.attempts || 0) + 1;
          const isDead = attempts >= MAX_ATTEMPTS;
          await db.pendingLocations.update(loc.id, {
            status: isDead ? "failed" : "pending",
            attempts,
            lastError: String(err?.message || err).slice(0, 300),
            nextAttemptAt: Date.now() + computeBackoff(attempts),
          });
          failed++;
        }
      }
      return { success, failed };
    });

    return result ?? { success: 0, failed: 0 };
  },

  async getQueueStats() {
    const [pending, failed, dead, syncing, locs] = await Promise.all([
      db.outbox.where("status").equals("pending").count(),
      db.outbox.where("status").equals("failed").count(),
      db.outbox.where("status").equals("dead").count(),
      db.outbox.where("status").equals("syncing").count(),
      db.pendingLocations.where("status").equals("pending").count(),
    ]);
    return { pending, failed, dead, syncing, pendingLocations: locs };
  },

  async syncAll(apiSyncFn: (data: any) => Promise<any>) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const [sos, locs] = await Promise.all([
      offlineService.syncPending(apiSyncFn),
      offlineService.syncPendingLocations(),
    ]);
    if (sos.success > 0 || locs.success > 0) {
      toast.success(
        `✅ Synced ${sos.success} report(s), ${locs.success} location(s)`,
        { duration: 3000 }
      );
    }
    return { sos, locs };
  },
};

if (typeof window !== "undefined") {
  let retryTimer: any = null;
  const kick = async () => {
    try {
      const { sosService } = await import("./sosService");
      const apiFn = async (payload: any) => {
        const { generic } = await import("../lib/api");
        return generic.create("sos", payload);
      };
      await offlineService.syncAll(apiFn);
    } catch (e) {
      console.warn("[OfflineService] kick failed", e);
    }
  };
  window.addEventListener("online", () => {
    console.log("[OfflineService] back online, syncing");
    kick();
  });
  retryTimer = setInterval(() => {
    if (navigator.onLine) kick();
  }, 60_000);
  window.addEventListener("beforeunload", () => clearInterval(retryTimer));
}
