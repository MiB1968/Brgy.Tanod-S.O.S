import { pool } from '../db/index';

interface GeofenceResult {
  is_outside_barangay: boolean;
  checked_at: Date;
}

export async function checkAndUpdateGeofence(
  residentId: string, 
  lat: number, 
  lng: number
): Promise<GeofenceResult | null> {
  try {
    // Get the latest barangay boundary
    const boundaryRes = await pool.query(
      `SELECT boundary_geojson FROM barangay_boundaries ORDER BY created_at DESC LIMIT 1`
    );

    if (boundaryRes.rows.length === 0) {
      console.warn('[Geofence] No barangay boundary configured in database.');
      return null;
    }

    const boundary = boundaryRes.rows[0].boundary_geojson;
    const isInside = isPointInPolygon(lat, lng, boundary);

    // Update resident record
    await pool.query(
      `UPDATE residents 
       SET is_outside_barangay = $1, 
           last_location_check = NOW() 
       WHERE id = $2`,
      [!isInside, residentId]
    );

    return {
      is_outside_barangay: !isInside,
      checked_at: new Date(),
    };
  } catch (err) {
    console.error('[Geofence] Error checking location:', err);
    return null;
  }
}

// Basic point-in-polygon check (replace with Turf.js for production accuracy)
function isPointInPolygon(lat: number, lng: number, polygon: any): boolean {
  if (!polygon?.coordinates?.[0]) return true;

  const coords = polygon.coordinates[0];
  let inside = false;

  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0], yi = coords[i][1];
    const xj = coords[j][0], yj = coords[j][1];

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
