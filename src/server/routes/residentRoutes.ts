import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { pool } from '../db/index';
import { checkAndUpdateGeofence } from '../services/geofencingService';

const router = Router();

// PATCH /api/residents/:id/location
router.patch('/:id/location', authenticate, async (req: any, res) => {
  const { id } = req.params;

  // Security: Only allow users to update their own location unless they are admin/tanod
  const isAdminOrTanod = ['admin', 'super_admin', 'tanod', 'captain'].includes(req.user?.role || '');
  if (!isAdminOrTanod && req.user?.id !== id) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized: Cannot update location for another resident'
    });
  }
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ 
      success: false, 
      message: 'Latitude and longitude are required' 
    });
  }

  try {
    // Update location in database
    await pool.query(
      `UPDATE residents 
       SET gps_lat = $1, gps_lng = $2, updated_at = NOW() 
       WHERE id = $3`,
      [lat, lng, id]
    );

    // Run geofence validation
    const geofenceResult = await checkAndUpdateGeofence(id, lat, lng);

    res.json({
      success: true,
      message: 'Location updated successfully',
      is_outside_barangay: geofenceResult?.is_outside_barangay || false,
      checked_at: geofenceResult?.checked_at || null,
    });
  } catch (err: any) {
    console.error('[Location] Update error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update location' 
    });
  }
});

export default router;
