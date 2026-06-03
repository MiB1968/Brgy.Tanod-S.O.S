import { v4 as uuidv4 } from 'uuid';

import { fetchAPI } from './apiBase';

const DB_NAME = "TanodReports_Sync";
const STORE_NAME = "pendingReports";

interface PendingReport {
  id: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  lastAttempt?: Date;
  error?: string;
}

export const syncService = {
  async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async queueReport(reportData: any): Promise<void> {
    try {
      const db = await this.openDB();
      const report: PendingReport = {
        id: uuidv4(),
        data: reportData,
        timestamp: new Date(),
        retryCount: 0,
      };

      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).add(report);
      
      tx.oncomplete = () => {
        console.log("📌 Report queued for sync successfully:", report.id);
      };
      
      tx.onerror = (e) => {
        console.error("Transaction error while queuing report:", e);
      };
    } catch (error) {
      console.error("Failed to queue report in IndexedDB:", error);
      this.saveToLocalStorageFallback(reportData);
    }
  },

  async syncPendingReports(): Promise<void> {
    if (!navigator.onLine) {
      console.log("🌐 Offline - skipping reports synchronizer process");
      return;
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      
      const request = store.getAll();
      request.onsuccess = async () => {
        const pendingReports: PendingReport[] = request.result;
        if (!pendingReports || pendingReports.length === 0) return;

        console.log(`🔄 Syncing ${pendingReports.length} pending reports to Barangay Hall Command Center...`);

        // Use sequential sync to prevent out-of-order records
        for (const report of pendingReports) {
          await this.attemptSync(report);
        }
      };
    } catch (error) {
      console.error("Critical sync controller error:", error);
    }
  },

  async attemptSync(report: PendingReport): Promise<void> {
    const MAX_RETRIES = 5;
    const BACKOFF_MS = 2000;

    if (report.retryCount >= MAX_RETRIES) {
      console.warn(`⛔ Max retries reached for report ${report.id}. Redirecting to manual review registry.`);
      await this.moveToFailedLog(report);
      await this.deleteFromStore(report.id);
      return;
    }

    try {
      const response = await fetchAPI('/tanod/reports', {
        method: 'POST',
        body: JSON.stringify({
          ...report.data,
          syncedAt: new Date().toISOString(),
          tanodReportId: report.id
        }),
      });

      // fetchAPI throws if response is not ok, so if we reach here it was successful
      console.log(`✅ Successfully synced report: ${report.id}`);
      await this.deleteFromStore(report.id);
    } catch (error: any) {
      const retryCount = report.retryCount + 1;
      const errorMsg = error.message || "Unknown synchronization interface error";

      console.error(`❌ Sync failed for report ${report.id} (Attempt ${retryCount}/${MAX_RETRIES}):`, errorMsg);

      const db = await this.openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      
      const updatedReport = {
        ...report,
        retryCount,
        lastAttempt: new Date(),
        error: errorMsg
      };

      store.put(updatedReport);

      if (retryCount < MAX_RETRIES) {
        setTimeout(() => this.syncPendingReports(), BACKOFF_MS * Math.pow(1.5, retryCount));
      }
    }
  },

  async deleteFromStore(id: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
  },

  async moveToFailedLog(report: PendingReport): Promise<void> {
    try {
      const failedKey = "tanod_failed_reports";
      const failed = JSON.parse(localStorage.getItem(failedKey) || "[]");
      failed.push({
        ...report,
        failedAt: new Date(),
      });
      localStorage.setItem(failedKey, JSON.stringify(failed));
      console.warn("💾 Failed report saved in local failsafe registry:", report.id);
    } catch (e) {
      console.error("Failsafe logger writing failed:", e);
    }
  },

  saveToLocalStorageFallback(reportData: any) {
    try {
      const fallbackKey = "tanod_fallback_reports";
      const fallback = JSON.parse(localStorage.getItem(fallbackKey) || "[]");
      fallback.push({
        id: uuidv4(),
        data: reportData,
        timestamp: new Date(),
      });
      localStorage.setItem(fallbackKey, JSON.stringify(fallback));
      console.log("💾 Offline metadata fallback saved to custom localStorage registry");
    } catch (e) {
      console.error("Both IndexedDB and local web storage failed:", e);
    }
  },

  async clearAllPending(): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      console.log("🧹 All queued sync elements purged successfully");
    } catch (error) {
      console.error("Failed to empty syncing store:", error);
    }
  },

  async processAllQueues(): Promise<void> {
    console.log('[Sync] Starting full queue processing...');
    if (!navigator.onLine) {
      console.log('🌐 Offline - Skipping full queue processing.');
      return;
    }
    try {
      // 1. Sync pending SOS reports
      await this.syncPendingReports();

      // 2. Sync pending locations
      const { offlineService } = await import('./offlineService');
      const locationSyncResult = await offlineService.syncPendingLocations();
      console.log(`📡 [Sync] Synced pending locations: ${locationSyncResult.success} success, ${locationSyncResult.failed} failed`);

      // 3. Sync pending actions (status updates, activity logs, role changes)
      const actionSyncResult = await offlineService.syncPendingQueuedActions();
      console.log(`📡 [Sync] Synced queued actions: ${actionSyncResult.success} success, ${actionSyncResult.failed} failed`);

      console.log('[Sync] All queues processed successfully');
    } catch (error) {
      console.error('[Sync] Queue processing failed:', error);
    }
  }
};

// Bind browser status triggers
if (typeof window !== "undefined") {
  window.addEventListener('online', () => {
    console.log("🌐 Connection retrieved online - starting full synchronizer batch process");
    syncService.processAllQueues().catch(err => console.error('[Sync] Full queue processing failed on-line:', err));
  });

  // Schedule background startup check
  setTimeout(() => {
    syncService.processAllQueues().catch(err => console.error('[Sync] Full queue processing failed on startup:', err));
  }, 4000);
}
