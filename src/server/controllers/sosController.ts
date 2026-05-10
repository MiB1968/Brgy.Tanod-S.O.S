import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../db/index';
import * as socketService from '../sockets/index';
import * as response from '../utils/response';
import { haversineDistance } from '../utils/geo';

export const createAlert = async (req: AuthRequest, res: Response) => {
  const { type, location, description, severity } = req.body;
  const userId = req.user?.id;

  if (!type || !location) {
    return response.error(res, "Type and location are required", "BAD_REQUEST", 400);
  }

  try {
    // Check for existing active alert from same user to prevent spam
    const activeCheck = await pool.query(
      "SELECT id FROM alerts WHERE resident_id = $1 AND (status = 'pending' OR status = 'active' OR status = 'responding') LIMIT 1",
      [userId]
    );

    if (activeCheck.rows.length > 0) {
      return response.error(res, "You already have an active SOS alert. Please use the chat to provide updates.", "CONFLICT", 409);
    }

    const result = await pool.query(
      `INSERT INTO alerts (
        resident_id, type, location, description, status, severity_score, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'pending', $5, now(), now()) RETURNING *`,
      [userId, type, JSON.stringify(location), description || '', severity || 3]
    );

    const alert = result.rows[0];
    
    // Get user details for the socket emit
    const userResult = await pool.query("SELECT name FROM users WHERE id = $1", [userId]);
    const residentName = userResult.rows[0]?.name || 'Unknown Resident';

    const fullAlert = {
      ...alert,
      residentName,
      location: typeof alert.location === 'string' ? JSON.parse(alert.location) : alert.location,
      timestamp: alert.created_at
    };

    socketService.emitToAll("alert_new", fullAlert);
    
    // Also notify admins specifically if needed, but emitToAll handles it for now
    
    return res.status(201).json({
      success: true,
      data: fullAlert
    });
  } catch (err: any) {
    console.error("SOS_ALERT_ERROR:", err);
    return response.error(res, "Failed to initiate SOS alert. Please try calling emergency hotline.");
  }
};

export const cancelAlert = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const alertCheck = await pool.query(
      "SELECT resident_id, status FROM alerts WHERE id = $1",
      [id]
    );

    if (alertCheck.rows.length === 0) {
      return response.error(res, "Alert not found", "NOT_FOUND", 404);
    }

    const alert = alertCheck.rows[0];
    if (alert.resident_id !== userId && req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      return response.error(res, "Permission denied", "FORBIDDEN", 403);
    }

    if (alert.status === 'resolved' || alert.status === 'cancelled') {
        return response.error(res, "Alert is already completed", "CONFLICT", 409);
    }

    const result = await pool.query(
      "UPDATE alerts SET status = 'cancelled', updated_at = now() WHERE id = $1 RETURNING *",
      [id]
    );

    const updatedAlert = result.rows[0];
    socketService.emitToAll("alert_update", { alert: updatedAlert });

    return res.json({
      success: true,
      data: updatedAlert
    });
  } catch (err: any) {
    return response.error(res, err.message);
  }
};

export const getActiveAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT a.*, u.name as \"residentName\" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.status IN ('pending', 'active', 'responding') ORDER BY a.created_at DESC"
    );
    
    return res.json({
      success: true,
      data: result.rows.map(a => ({
        ...a,
        location: typeof a.location === 'string' ? JSON.parse(a.location) : a.location,
        timestamp: a.created_at
      }))
    });
  } catch (err: any) {
    return response.error(res, err.message);
  }
};

export const findNearest = async (req: AuthRequest, res: Response) => {
  const { lat, lng } = req.body ?? {};

  if (typeof lat !== "number" || typeof lng !== "number") {
    return response.error(res, "lat and lng must be numbers", "BAD_REQUEST", 400);
  }

  const activeLocations = socketService.getActiveLocations();
  
  let nearest: any = null;
  let minDistance = Infinity;

  for (const loc of activeLocations) {
    if (loc.role !== "tanod") continue;
    if (typeof loc.lat !== "number" || typeof loc.lng !== "number") continue;

    const d = haversineDistance({ lat, lng }, loc);
    if (d < minDistance) {
      minDistance = d;
      nearest = loc;
    }
  }

  if (nearest) {
    nearest = { ...nearest, distance_metres: Math.round(minDistance) };
  }

  return res.json({
    success: true,
    data: {
      nearest_tanod: nearest,
      active_tanods: activeLocations.filter(l => l.role === "tanod").length
    }
  });
};
