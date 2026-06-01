import * as turf from '@turf/turf';
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
    const boundaryRes = await pool.query(
      `SELECT boundary_geojson FROM barangay_boundaries ORDER BY created_at DESC LIMIT 1`
    );

    if (boundaryRes.rows.length === 0) {
      console.warn('[Geofence] No barangay boundary configured.');
      return null;
    }

    const boundaryGeoJSON = boundaryRes.rows[0].boundary_geojson;

    // Create a Turf point from the resident's coordinates
    // Note: GeoJSON expects [longitude, latitude]
    const point = turf.point([lng, lat]);

    // Create a Turf polygon from the stored boundary
    const polygon = turf.polygon(boundaryGeoJSON.coordinates);

    // Accurate point-in-polygon check using Turf.js
    const isInside = turf.booleanPointInPolygon(point, polygon);

    // Update the resident record
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
    console.error('[Geofence] Error during geofence check:', err);
    return null;
  }
}
