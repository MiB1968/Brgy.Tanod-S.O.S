import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../db/index';
import * as socketService from '../sockets/index';
import * as response from '../utils/response';

export const createAlert = async (req: AuthRequest, res: Response) => {
  const { type, location, customMessage, severity } = req.body;
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
        resident_id, type, location, custom_message, status, severity_score, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'pending', $5, now(), now()) RETURNING *`,
      [userId, type, JSON.stringify(location), customMessage || '', severity || 3]
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
