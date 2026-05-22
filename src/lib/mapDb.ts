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

export interface LocalKnowledge {
  id?: number;
  source: string;
  title: string;
  content: string;
  url: string;
  scrapedAt: string;
  category: 'disaster' | 'procedure' | 'announcement' | 'contact';
}

export class MapDatabase extends Dexie {
  tiles!: Table<MapTile>;
  pendingAlerts!: Table<OfflineAlert>;
  downloadedAreas!: Table<any>;
  localKnowledge!: Table<LocalKnowledge>;

  constructor() {
    super('TanodNetCache');
    this.version(2).stores({
      tiles: '++id, url',
      pendingAlerts: '++id, timestamp'
    });
    this.version(3).stores({
      tiles: '++id, url',
      pendingAlerts: '++id, timestamp',
      downloadedAreas: '++id, name, downloadedAt'
    });
    this.version(4).stores({
      tiles: '++id, url',
      pendingAlerts: '++id, timestamp',
      downloadedAreas: '++id, name, downloadedAt',
      localKnowledge: '++id, source, category, scrapedAt'
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
