import { SOSDatabase } from './offlineDB';

// Fallback mock database for incognito / restricted environments
class MockSOSDatabase {
  chain = () => ({
    anyOf: () => this.chain(),
    equals: () => this.chain(),
    below: () => this.chain(),
    and: () => this.chain(),
    toArray: async () => [],
    delete: async () => 1,
    modify: async () => 0,
    count: async () => 0,
    first: async () => undefined,
    sortBy: async () => [],
  });
  outbox = { add: async () => 1, where: () => this.chain(), update: async () => 1, delete: async () => 1, get: async () => undefined, count: async () => 0 };
  synced = { add: async () => 1, where: () => this.chain() };
  pendingLocations = { add: async () => 1, where: () => this.chain(), update: async () => 1, delete: async () => 1, count: async () => 0, put: async () => "" };
  aiChatHistory = { add: async () => 1, where: () => this.chain(), delete: async () => 1 };
  queuedActions = { add: async () => 1, where: () => this.chain(), update: async () => 1, delete: async () => 1, orderBy: () => ({ toArray: async () => [] }) };
  protocols = { add: async () => 1, where: () => this.chain() };
  audioCache = { add: async () => 1, where: () => this.chain() };
  transaction = async (_m: any, _t: any, cb: any) => await cb();
}

let safeDb: any;
try {
  safeDb = new SOSDatabase();
} catch (err) {
  console.warn("IndexedDB restricted (likely Incognito mode). Offline features disabled.");
  safeDb = new MockSOSDatabase();
}

export const db = safeDb as SOSDatabase;

export const cleanupOldQueues = async () => {
  try {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    await db.queuedActions.where("timestamp").below(threeDaysAgo).delete();
    // Remove dead-letter outbox entries older than 14 days
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    await db.outbox.where("status").equals("dead").and((r) => (r.createdAt || 0) < fourteenDaysAgo).delete();
  } catch (err) {
    console.warn("Could not cleanup old queues", err);
  }
};
