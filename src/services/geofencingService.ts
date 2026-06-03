import { pool } from '../db';

let cachedBoundary: any = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

async function getBoundary() {
  if (Date.now() < cacheExpiry && cachedBoundary) return cachedBoundary;

  try {
    const res = await pool.query(
      'SELECT boundary_geojson FROM barangay_boundaries ORDER BY created_at DESC LIMIT 1'
    );
    cachedBoundary = res.rows[0]?.boundary_geojson ?? null;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return cachedBoundary;
  } catch (err) {
    console.error('[geofencingService] Failed to load boundary:', err);
    return null;
  }
}

export async function checkAndUpdateGeofence(userId: string, lat: number, lng: number) {
  const boundary = await getBoundary();
  if (!boundary) return;
  console.log(`[geofencingService] Boundary cached. Checking user ${userId}`);
}
