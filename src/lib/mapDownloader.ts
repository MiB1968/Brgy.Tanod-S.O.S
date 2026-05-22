import { cacheTile } from './mapDb';

export const OCCIDENTAL_MINDORO_BOUNDS = {
  minLat: 13.10, // Mamburao specific bounds
  maxLat: 13.35,
  minLng: 120.50,
  maxLng: 120.75
};

function lat2tile(lat: number, zoom: number) {
  return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
}

function lng2tile(lon: number, zoom: number) {
  return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export async function downloadRegion(
  bounds: Bounds,
  zoomLevels: number[] = [12, 13, 14, 15, 16],
  onProgress: (current: number, total: number) => void
) {
  const tasks: { url: string }[] = [];

  for (const zoom of zoomLevels) {
    const startX = lng2tile(bounds.minLng, zoom);
    const endX = lng2tile(bounds.maxLng, zoom);
    const startY = lat2tile(bounds.maxLat, zoom);
    const endY = lat2tile(bounds.minLat, zoom);

    const xStartIdx = Math.min(startX, endX);
    const xEndIdx = Math.max(startX, endX);
    const yStartIdx = Math.min(startY, endY);
    const yEndIdx = Math.max(startY, endY);

    for (let x = xStartIdx; x <= xEndIdx; x++) {
      for (let y = yStartIdx; y <= yEndIdx; y++) {
        tasks.push({ url: `https://a.basemaps.cartocdn.com/dark_all/${zoom}/${x}/${y}.png` });
        // Also support @2x variant in case high-density screens trigger high-dpi requests
        tasks.push({ url: `https://a.basemaps.cartocdn.com/dark_all/${zoom}/${x}/${y}@2x.png` });
      }
    }
  }

  const total = tasks.length;
  let current = 0;

  // Process in smaller batches
  const batchSize = 6;
  const subdomains = ['a', 'b', 'c', 'd', '{s}'];
  
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    await Promise.all(batch.map(async (task) => {
      let retries = 3;
      while (retries > 0) {
        try {
          const response = await fetch(task.url, { mode: 'cors' });
          if (response.ok) {
            const blob = await response.blob();
            // Store under all possible Leaflet subdomains to guarantee offline hits
            for (const s of subdomains) {
              const mappedUrl = task.url.replace(/a\.basemaps/, `${s}.basemaps`);
              await cacheTile(mappedUrl, blob);
            }
            break; // Success, exit retry loop
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } catch (e) {
          retries--;
          if (retries === 0) {
            console.error('Failed to download tile:', task.url, e);
          } else {
            // Wait before retrying (exponential backoff)
            const delay = Math.pow(2, 3 - retries) * 500 + Math.random() * 500;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      current++;
      onProgress(current, total);
    }));
  }
}
