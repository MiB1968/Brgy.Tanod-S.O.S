import Dexie, { Table } from 'dexie';

export interface MapTile {
  id?: number;
  url: string;
  blob: Blob;
  timestamp: number;
}

export interface OfflineAlert {
  id?: number;
  data: any;
  timestamp: number;
}

export interface OfflineIncident {
  id?: number;
  data: any;
  supabaseData?: any;
  timestamp: number;
}

export interface OfflinePatrol {
  id?: number;
  data: any;
  type: 'status_update' | 'route_point';
  sessionId?: string;
  tanodId?: string;
  timestamp: number;
}

export class MapDatabase extends Dexie {
  tiles!: Table<MapTile>;
  pendingAlerts!: Table<OfflineAlert>;
  pendingIncidents!: Table<OfflineIncident>;
  pendingPatrols!: Table<OfflinePatrol>;

  constructor() {
    super('TanodNetCache');
    this.version(2).stores({
      tiles: '++id, url',
      pendingAlerts: '++id, timestamp'
    });
    this.version(3).stores({
      tiles: '++id, url',
      pendingAlerts: '++id, timestamp',
      pendingIncidents: '++id, timestamp',
      pendingPatrols: '++id, timestamp'
    }).upgrade(tx => {
      // Nothing needed to upgrade from 2 -> 3 since we just added tables
    });
  }
}

export const db = new MapDatabase();

export async function cacheTile(url: string, blob: Blob) {
  const existing = await db.tiles.where('url').equals(url).first();
  if (existing) {
    await db.tiles.update(existing.id!, { blob, timestamp: Date.now() });
  } else {
    await db.tiles.add({ url, blob, timestamp: Date.now() });
  }
}

export async function getCachedTile(url: string): Promise<string | null> {
  const tile = await db.tiles.where('url').equals(url).first();
  if (tile) {
    return URL.createObjectURL(tile.blob);
  }
  return null;
}
