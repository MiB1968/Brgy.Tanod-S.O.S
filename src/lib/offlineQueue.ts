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

export async function queueIncident(data: any, supabaseData?: any) {
  try {
    const id = await db.pendingIncidents.add({
      data,
      supabaseData,
      timestamp: Date.now(),
    });
    console.log('Incident queued in IndexedDB:', id);
    return id.toString();
  } catch (error) {
    console.error('Failed to queue Incident in IndexedDB:', error);
    return null;
  }
}

export async function flushIncidentQueue(processFn: (data: any, supabaseData?: any) => Promise<void>) {
  try {
    const queue = await db.pendingIncidents.toArray();
    if (queue.length === 0) return;

    console.log(`[IndexedDB] Flushing ${queue.length} queued Incidents...`);

    for (const item of queue) {
      try {
        await processFn(item.data, item.supabaseData);
        if (item.id) await db.pendingIncidents.delete(item.id);
      } catch (error) {
        console.error(`Failed to process queued Incident ${item.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to flush Incident queue from IndexedDB:', error);
  }
}

export async function queuePatrol(data: any, type: 'status_update' | 'route_point', sessionId?: string, tanodId?: string) {
  try {
    const id = await db.pendingPatrols.add({
      data,
      type,
      sessionId,
      tanodId,
      timestamp: Date.now(),
    });
    console.log(`Patrol data (${type}) queued in IndexedDB:`, id);
    return id.toString();
  } catch (error) {
    console.error('Failed to queue Patrol data in IndexedDB:', error);
    return null;
  }
}

export async function flushPatrolQueue(processFn: (data: any, type: 'status_update' | 'route_point', sessionId?: string, tanodId?: string) => Promise<void>) {
  try {
    const queue = await db.pendingPatrols.toArray();
    if (queue.length === 0) return;

    console.log(`[IndexedDB] Flushing ${queue.length} queued Patrol items...`);

    for (const item of queue) {
      try {
        await processFn(item.data, item.type, item.sessionId, item.tanodId);
        if (item.id) await db.pendingPatrols.delete(item.id);
      } catch (error) {
        console.error(`Failed to process queued Patrol item ${item.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to flush Patrol queue from IndexedDB:', error);
  }
}

export async function getQueueSize(): Promise<number> {
  try {
    const alertsCount = await db.pendingAlerts.count();
    const incidentsCount = await db.pendingIncidents.count();
    const patrolsCount = await db.pendingPatrols.count();
    return alertsCount + incidentsCount + patrolsCount;
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
