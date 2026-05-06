import { db } from './mapDb';

export interface QueuedSOS {
  id?: number;
  data: any;
  timestamp: number;
}

export async function queueSOS(data: any) {
  try {
    const id = await db.pendingAlerts.add({
      data,
      timestamp: Date.now(),
    });
    console.log('SOS queued in IndexedDB:', id);
    return id.toString();
  } catch (error) {
    console.error('Failed to queue SOS in IndexedDB:', error);
    return null;
  }
}

export async function removeQueuedSOS(idToRemove: string) {
  try {
    // If it's a numeric ID from Dexie
    if (!isNaN(Number(idToRemove))) {
      await db.pendingAlerts.delete(Number(idToRemove));
      return;
    }
    
    // Otherwise search by data.id (the UUID)
    const item = await db.pendingAlerts.filter(item => item.data.id === idToRemove).first();
    if (item && item.id) {
      await db.pendingAlerts.delete(item.id);
    }
  } catch (error) {
    console.error('Failed to remove queued SOS:', error);
  }
}

export async function flushSOSQueue(processFn: (data: any) => Promise<void>) {
  try {
    const queue = await db.pendingAlerts.toArray();
    if (queue.length === 0) return;

    console.log(`[IndexedDB] Flushing ${queue.length} queued SOS messages...`);
    
    for (const item of queue) {
      try {
        await processFn(item.data);
        // If successful, remove it
        if (item.id) await db.pendingAlerts.delete(item.id);
      } catch (error) {
        console.error(`Failed to process queued SOS ${item.id}:`, error);
        // Keep it in queue for next retry
      }
    }
  } catch (error) {
    console.error('Failed to flush SOS queue from IndexedDB:', error);
  }
}

export async function getQueueSize(): Promise<number> {
  try {
    return await db.pendingAlerts.count();
  } catch {
    return 0;
  }
}

export async function getQueuedItems(): Promise<QueuedSOS[]> {
  try {
    return await db.pendingAlerts.toArray();
  } catch {
    return [];
  }
}
