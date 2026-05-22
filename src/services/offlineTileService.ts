// src/services/offlineTileService.ts
import { cacheTile, db } from '../lib/mapDb';

export interface TileDownloadProgressEvent {
  progress: number;
  downloaded: number;
  total: number;
  status: 'idle' | 'downloading' | 'completed' | 'failed';
}

type ProgressCallback = (event: TileDownloadProgressEvent) => void;

class OfflineTileService {
  private static instance: OfflineTileService;
  private isDownloading = false;
  private currentLoaderAbortController: AbortController | null = null;

  public static getInstance(): OfflineTileService {
    if (!OfflineTileService.instance) {
      OfflineTileService.instance = new OfflineTileService();
    }
    return OfflineTileService.instance;
  }

  /**
   * Helper to convert geographic coordinate bounds and zoom levels to list of OSM Tile URLs
   */
  public getTileUrlsInBounds(
    bounds: { north: number; south: number; east: number; west: number },
    minZoom = 13,
    maxZoom = 16
  ): string[] {
    const urls: string[] = [];
    
    // Clamp zoom levels for security & sanity
    const startZoom = Math.max(10, Math.min(minZoom, 17));
    const endZoom = Math.max(startZoom, Math.min(maxZoom, 17));

    for (let z = startZoom; z <= endZoom; z++) {
      const minX = Math.floor((bounds.west + 180) / 360 * Math.pow(2, z));
      const maxX = Math.floor((bounds.east + 180) / 360 * Math.pow(2, z));
      
      const latRadNorth = (bounds.north * Math.PI) / 180;
      const latRadSouth = (bounds.south * Math.PI) / 180;
      
      const minY = Math.floor(
        (1 - Math.log(Math.tan(latRadNorth) + 1 / Math.cos(latRadNorth)) / Math.PI) / 2 * Math.pow(2, z)
      );
      const maxY = Math.floor(
        (1 - Math.log(Math.tan(latRadSouth) + 1 / Math.cos(latRadSouth)) / Math.PI) / 2 * Math.pow(2, z)
      );

      const yStart = Math.min(minY, maxY);
      const yEnd = Math.max(minY, maxY);

      // Clip bounds for extreme scopes
      const xStartIdx = Math.min(minX, maxX);
      const xEndIdx = Math.max(minX, maxX);

      for (let x = xStartIdx; x <= xEndIdx; x++) {
        for (let y = yStart; y <= yEnd; y++) {
          // Standard dark basemap subdomain template
          urls.push(`https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`);
        }
      }
    }

    return urls;
  }

  /**
   * Calculate a localized bounding box from a coordinate and radius in KM
   */
  public calculateBoundsFromPoint(lat: number, lng: number, radiusKm: number) {
    const kmPerDegree = 111.32;
    const latDelta = radiusKm / kmPerDegree;
    const lngDelta = radiusKm / (kmPerDegree * Math.cos((lat * Math.PI) / 180));

    return {
      north: Math.min(85, lat + latDelta),
      south: Math.max(-85, lat - latDelta),
      east: Math.min(180, lng + lngDelta),
      west: Math.max(-180, lng - lngDelta),
    };
  }

  public cancelDownload() {
    if (this.currentLoaderAbortController) {
      this.currentLoaderAbortController.abort();
      this.isDownloading = false;
    }
  }

  /**
   * Core download procedure with incremental feedback
   */
  public async downloadArea(
    bounds: { north: number; south: number; east: number; west: number },
    minZoom = 13,
    maxZoom = 16,
    onProgress?: ProgressCallback,
    areaName = "Mamburao Area"
  ): Promise<boolean> {
    if (this.isDownloading) {
      console.warn('[OfflineTileService] Download already in progress.');
      return false;
    }

    this.isDownloading = true;
    this.currentLoaderAbortController = new AbortController();
    const signal = this.currentLoaderAbortController.signal;

    const urls = this.getTileUrlsInBounds(bounds, minZoom, maxZoom);
    
    // Safety thresholds
    if (urls.length > 2000) {
      console.warn(`[OfflineTileService] Slicing large list: ${urls.length} tiles requested, cap at 2000.`);
      urls.splice(2000);
    }

    const total = urls.length;
    let downloaded = 0;

    if (total === 0) {
      this.isDownloading = false;
      onProgress?.({ progress: 100, downloaded: 0, total: 0, status: 'completed' });
      return true;
    }

    onProgress?.({ progress: 0, downloaded: 0, total, status: 'downloading' });

    const downloadQueue = [...urls];
    const CONCURRENCY = 6;

    const doWorker = async () => {
      while (downloadQueue.length > 0 && !signal.aborted) {
        const url = downloadQueue.shift();
        if (!url) break;

        try {
          // Check cache for existence
          const cleanUrl = url.replace(/^[a-z]\.basemaps/, '{s}.basemaps');
          const subdomains = ['a', 'b', 'c', 'd', '{s}'];
          let exists = false;
          
          for (const s of subdomains) {
            const checkUrl = url.replace(/a\.basemaps/, `${s}.basemaps`);
            const cached = await db.tiles.where('url').equals(checkUrl).first();
            if (cached) {
              exists = true;
              break;
            }
          }

          if (exists) {
            downloaded++;
            onProgress?.({
              progress: Math.round((downloaded / total) * 100),
              downloaded,
              total,
              status: 'downloading',
            });
            continue;
          }

          const response = await fetch(url, { signal, mode: 'cors' });
          if (response.ok) {
            const blob = await response.blob();
            // Cache across subdomains to guarantee successful lookups regardless of subdomain dynamic selections
            for (const s of subdomains) {
              const mappedUrl = url.replace(/a\.basemaps/, `${s}.basemaps`);
              await cacheTile(mappedUrl, blob);
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            throw err;
          }
          console.warn('[OfflineTileService] Failed to cache tile during preload:', url, err);
        }

        downloaded++;
        onProgress?.({
          progress: Math.round((downloaded / total) * 100),
          downloaded,
          total,
          status: 'downloading',
        });
      }
    };

    try {
      const workers = Array.from({ length: CONCURRENCY }, () => doWorker());
      await Promise.all(workers);

      if (signal.aborted) {
        onProgress?.({ progress: 0, downloaded, total, status: 'failed' });
        return false;
      }

      onProgress?.({ progress: 100, downloaded, total, status: 'completed' });

      // Auto-save downloaded area info to Dexie DB
      try {
        await db.downloadedAreas.add({
          name: areaName,
          bounds,
          minZoom,
          maxZoom,
          downloadedAt: new Date().toISOString(),
          tileCount: total
        });
        console.log(`[OfflineTileService] Succeeded pre-caching "${areaName}". Saved config metadata.`);
      } catch (dbErr) {
        console.error('[OfflineTileService] Failed to index downloaded map region on local database:', dbErr);
      }

      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[OfflineTileService] Download cancelled by user.');
      } else {
        console.error('[OfflineTileService] Download completed with errors:', err);
      }
      onProgress?.({ progress: 0, downloaded, total, status: 'failed' });
      return false;
    } finally {
      this.isDownloading = false;
      this.currentLoaderAbortController = null;
    }
  }

  public async autoPreloadAroundLocation(lat: number, lng: number, radiusKm = 1.5, onProgress?: ProgressCallback) {
    const bounds = this.calculateBoundsFromPoint(lat, lng, radiusKm);
    return this.downloadArea(bounds, 13, 16, onProgress);
  }

  public getDownloadingStatus(): boolean {
    return this.isDownloading;
  }

  public async getSavedAreas(): Promise<any[]> {
    try {
      return await db.downloadedAreas.orderBy('downloadedAt').reverse().toArray();
    } catch (err) {
      console.error('[OfflineTileService] Error loading saved offline zones:', err);
      return [];
    }
  }

  public async deleteSavedArea(id: number): Promise<void> {
    try {
      await db.downloadedAreas.delete(id);
      console.log(`[OfflineTileService] Removed saved area: ${id}`);
    } catch (err) {
      console.error('[OfflineTileService] Error deleting offline zone from indexing register:', err);
    }
  }

  public calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * 
        Math.cos((lat2 * Math.PI) / 180) * 
        Math.sin(dLon / 2) * 
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  public async getOfflineRoute(start: [number, number], end: [number, number], profile: 'driving' | 'walking' = 'driving') {
    const distance = this.calculateDistance(start[0], start[1], end[0], end[1]);
    
    // Simple but realistic routing for rural Mindoro
    const baseTime = profile === 'driving' ? distance * 2.8 : distance * 12; // minutes

    return {
      distance: distance.toFixed(2) + " km",
      estimatedTime: Math.round(baseTime) + " mins",
      difficulty: distance > 8 ? "Moderate" : "Easy",
      path: [start, end], // Can be expanded with real waypoints
      warning: distance > 20 ? "Long route - Check fuel" : null
    };
  }
}

export const offlineTileService = OfflineTileService.getInstance();
