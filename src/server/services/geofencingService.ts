import { pool } from '../db/index';

/**
 * Checks if a resident is outside the barangay boundaries and updates their status.
 */
export async function checkAndUpdateGeofence(residentId: string, lat: number, lng: number): Promise<{ is_outside_barangay: boolean } | undefined> {
  try {
    // Get barangay boundary
    const boundaryRes = await pool.query(
      `SELECT boundary_geojson FROM barangay_boundaries LIMIT 1`
    );

    if (boundaryRes.rows.length === 0) {
      console.warn('[Geofence] No barangay boundary configured');
      return;
    }

    const boundary = boundaryRes.rows[0].boundary_geojson;

    // Simple point-in-polygon check
    const isInside = isPointInPolygon(lat, lng, boundary);

    await pool.query(
      `UPDATE residents 
       SET is_outside_barangay = $1, last_location_check = NOW() 
       WHERE id = $2`,
      [!isInside, residentId]
    );

    return { is_outside_barangay: !isInside };
  } catch (err) {
    console.error('[Geofence] Error checking location:', err);
  }
}

// Basic point in polygon implementation
function isPointInPolygon(lat: number, lng: number, polygon: any): boolean {
  if (!polygon?.coordinates?.[0]) return true;

  // Assuming GeoJSON format: polygon.coordinates[0] is array of [lng, lat]
  const coords = polygon.coordinates[0];
  let inside = false;

  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    // GeoJSON is [longitude, latitude]
    const xi = coords[i][1], yi = coords[i][0]; // Extracting lat as x, lng as y for math consistency based on standard algo
    const xj = coords[j][1], yj = coords[j][0];

    // standard point in polygon algorithm - ray casting
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}
