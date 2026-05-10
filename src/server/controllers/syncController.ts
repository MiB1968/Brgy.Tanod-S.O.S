import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../db/index';
import * as socketService from '../sockets/index';
import * as response from '../utils/response';

export const getSync = async (req: AuthRequest, res: Response) => {
  const { path: fullPath } = req.query;
  if (!fullPath) return response.error(res, "Path required", "BAD_REQUEST", 400);

  const fullPathStr = decodeURIComponent(fullPath as string);
  const [basePath, searchParams] = fullPathStr.split('?');
  const parts = basePath.split('/');
  const collection = parts[0];
  const id = parts[1];

  try {
    if (collection === 'system' && id === 'siren') {
      const result = await pool.query("SELECT data FROM system_config WHERE key = 'siren'");
      return res.json(result.rows[0]?.data || { sirenActive: false });
    }

    if (collection === 'alerts' || collection === 'active_alerts') {
      if (id) {
        const result = await pool.query(
          "SELECT a.*, u.name as \"residentName\" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.id = $1", 
          [id]
        );
        const alert = result.rows[0];
        if (!alert) return response.error(res, "Alert not found", "NOT_FOUND", 404);
        return res.json({
          ...alert,
          location: typeof alert.location === 'string' ? JSON.parse(alert.location) : alert.location,
          timestamp: alert.created_at
        });
      } else {
        const query = "SELECT a.*, u.name as \"residentName\" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id ORDER BY a.created_at DESC LIMIT 100";
        const result = await pool.query(query);
        return res.json(result.rows.map(a => ({
          ...a,
          location: typeof a.location === 'string' ? JSON.parse(a.location) : a.location,
          timestamp: a.created_at
        })));
      }
    }

    if (collection === 'incidents') {
      const result = await pool.query("SELECT * FROM incidents ORDER BY timestamp DESC LIMIT 100");
      return res.json(result.rows.map(i => ({ id: i.id, ...i })));
    }

    if (collection === 'users' || collection === 'residents') {
      if (searchParams?.includes('role=tanod')) {
          const result = await pool.query("SELECT id, email, name, role, status FROM users WHERE role = 'tanod'");
          return res.json(result.rows);
      }
      if (id) {
        const result = await pool.query("SELECT id, email, name, role, status FROM users WHERE id = $1", [id]);
        return res.json(result.rows[0] || null);
      }
      const result = await pool.query("SELECT id, email, name, role, status FROM users WHERE role = 'resident'");
      return res.json(result.rows);
    }

    if (collection === 'patrols') {
      const result = await pool.query("SELECT * FROM patrols");
      return res.json(result.rows.map(p => ({
        id: p.tanod_id,
        tanodId: p.tanod_id,
        tanodName: p.tanod_name,
        isActive: p.is_active,
        status: p.status,
        location: typeof p.location === 'string' ? JSON.parse(p.location) : p.location,
        lastUpdate: p.last_ping
      })));
    }

    if (collection === 'system_broadcasts' || collection === 'broadcasts') {
      const query = (searchParams?.includes('isActive=true'))
        ? "SELECT * FROM system_broadcasts WHERE isactive = true ORDER BY timestamp DESC"
        : "SELECT * FROM system_broadcasts ORDER BY timestamp DESC LIMIT 100";
      const result = await pool.query(query);
      return res.json(result.rows);
    }

    if (collection === 'audit_logs') {
      const result = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100");
      return res.json(result.rows);
    }

    if (collection === 'tanod_activity_logs') {
      const result = await pool.query("SELECT * FROM tanod_activity_logs ORDER BY timestamp DESC LIMIT 100");
      return res.json(result.rows.map(l => ({
        id: l.id,
        ...l,
        location: typeof l.location === 'string' ? JSON.parse(l.location) : l.location
      })));
    }

    if (collection === 'patrol_sessions') {
      const result = await pool.query("SELECT * FROM patrol_sessions ORDER BY start_time DESC LIMIT 50");
      return res.json(result.rows.map(s => ({
        id: s.id,
        ...s,
        route: typeof s.route === 'string' ? JSON.parse(s.route) : s.route
      })));
    }

    response.error(res, `Path not mapped: ${fullPathStr}`, "NOT_IMPLEMENTED", 404);
  } catch (err: any) {
    response.error(res, err.message);
  }
};

export const postSync = async (req: AuthRequest, res: Response) => {
  const { path: fullPath, id, data, options } = req.body;
  if (!fullPath) return response.error(res, "Path required", "BAD_REQUEST", 400);

  const parts = (fullPath as string).split('/');
  const collection = parts[0];
  const docId = id || parts[1];

  try {
    if (collection === 'system' && docId === 'siren') {
      await pool.query(
        "INSERT INTO system_config (key, data, updated_at) VALUES ('siren', $1, now()) ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = now()",
        [JSON.stringify(data)]
      );
      socketService.emitToAll("siren_update", data);
      return res.json({ success: true });
    }

    if (collection === 'patrol_sessions') {
      if (options?.merge) {
        const current = await pool.query("SELECT route FROM patrol_sessions WHERE id = $1", [docId]);
        let newRoute = data.route;
        if (data.route?._type === 'arrayUnion' && current.rows[0]) {
           newRoute = [...(current.rows[0].route || []), ...data.route.elements];
        }
        
        await pool.query(
          "UPDATE patrol_sessions SET route = COALESCE($1, route), end_time = COALESCE($2, end_time) WHERE id = $3",
          [newRoute ? JSON.stringify(newRoute) : null, data.endTime || null, docId]
        );
      } else {
        await pool.query(
          "INSERT INTO patrol_sessions (id, tanod_id, tanod_name, start_time, route) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET route = $5",
          [docId, data.tanodId, data.tanodName, data.startTime, JSON.stringify(data.route || [])]
        );
      }
      return res.json({ success: true, id: docId });
    }

    if (collection === 'tanod_activity_logs') {
      await pool.query(
        "INSERT INTO tanod_activity_logs (tanod_id, tanod_name, type, timestamp, details, location) VALUES ($1, $2, $3, $4, $5, $6)",
        [data.tanodId, data.tanodName, data.type, data.timestamp, data.details, JSON.stringify(data.location || null)]
      );
      return res.json({ success: true });
    }

    if (collection === 'users') {
      const fieldMapping: Record<string, string> = { status: 'status', role: 'role', name: 'name', email: 'email' };
      const safeData: Record<string, any> = {};
      Object.keys(data).forEach(key => { if (fieldMapping[key]) safeData[fieldMapping[key]] = data[key]; });

      const safeFields = Object.keys(safeData);
      if (safeFields.length === 0) return response.error(res, "No valid fields to update", "BAD_REQUEST", 400);

      const setClause = safeFields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      await pool.query(`UPDATE users SET ${setClause}, last_active = now() WHERE id = $1`, [docId, ...safeFields.map(f => safeData[f])]);
      
      socketService.emitToAll("tanod_update", { id: docId, ...safeData });
      return res.json({ success: true });
    }

    if (collection === 'residents') {
      const fieldMapping: Record<string, string> = {
        name: 'name', phone: 'phone', address: 'address', status: 'status',
        house_number: 'house_number', household_size: 'household_size',
        blood_type: 'blood_type', medical_conditions: 'medical_conditions',
        gps_lat: 'gps_lat', gps_lng: 'gps_lng', is_verified: 'is_verified',
        verification_date: 'verification_date', rejection_reason: 'rejection_reason'
      };
      // Note: mapping logic in server.ts was more verbose (handling camelCase etc), 
      // but let's keep it robust by checking both or adapting.
      const safeData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
         const mapped = fieldMapping[key] || fieldMapping[key.replace(/([A-Z])/g, "_$1").toLowerCase()];
         if (mapped) safeData[mapped] = data[key];
      });

      const safeFields = Object.keys(safeData);
      if (safeFields.length === 0) return response.error(res, "No valid fields to update", "BAD_REQUEST", 400);
      const setClause = safeFields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      await pool.query(`UPDATE residents SET ${setClause} WHERE id = $1`, [docId, ...safeFields.map(f => safeData[f])]);
      socketService.emitToAll("resident_update", { id: docId, ...safeData });
      return res.json({ success: true });
    }

    if (collection === 'patrols') {
      const isActive = data.isActive ?? data.is_active;
      const location = data.location ? JSON.stringify(data.location) : null;
      const status = data.status;
      const tanodName = data.tanodName ?? data.tanod_name;

      await pool.query(
        `INSERT INTO patrols (tanod_id, is_active, location, status, tanod_name, last_ping)
         VALUES ($1, COALESCE($2, true), COALESCE($3, '{}'::jsonb), COALESCE($4, 'Available'), COALESCE($5, 'Active Tanod'), now())
         ON CONFLICT (tanod_id) DO UPDATE SET 
         is_active = COALESCE(EXCLUDED.is_active, patrols.is_active),
         location = CASE WHEN EXCLUDED.location = '{}'::jsonb AND patrols.location IS NOT NULL THEN patrols.location ELSE EXCLUDED.location END,
         status = COALESCE(EXCLUDED.status, patrols.status),
         tanod_name = CASE WHEN EXCLUDED.tanod_name = 'Active Tanod' AND patrols.tanod_name IS NOT NULL THEN patrols.tanod_name ELSE EXCLUDED.tanod_name END,
         last_ping = now()`,
        [docId, isActive, location, status, tanodName]
      );
      
      socketService.emitToAll("patrol_update", { 
        tanod_id: docId, tanodId: docId, tanodName, isActive, location: data.location, status, lastUpdate: new Date().toISOString()
      });
      return res.json({ success: true });
    }

    if (collection === 'system_broadcasts' || collection === 'broadcasts') {
      if (docId) {
        await pool.query("UPDATE system_broadcasts SET isActive = $1 WHERE id = $2", [data.isActive, docId]);
        const result = await pool.query("SELECT * FROM system_broadcasts WHERE id = $1", [docId]);
        socketService.emitToAll("broadcast_update", result.rows[0]);
      } else {
        const result = await pool.query(
          "INSERT INTO system_broadcasts (adminId, adminName, message, type, isactive, timestamp) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
          [data.adminId, data.adminName, data.message, data.type, data.isActive ?? true, data.timestamp || new Date().toISOString()]
        );
        socketService.emitToAll("broadcast_update", result.rows[0]);
      }
      return res.json({ success: true });
    }

    if (collection === 'incidents') {
      await pool.query(
        `INSERT INTO incidents (alert_id, tanod_id, tanod_name, timestamp, type, location, gps_location, description, persons_involved, actions_taken, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [data.alertId || null, data.tanodId, data.tanodName, data.timestamp || new Date().toISOString(), data.type, data.location, JSON.stringify(data.gpsLocation || null), data.description, data.personsInvolved || null, data.actionsTaken || null, data.status || 'pending']
      );
      return res.json({ success: true });
    }

    if (collection === 'alerts') {
      const allowedFields = ['status', 'severity_score', 'ai_analysis', 'resolved_at', 'assignedTo', 'assignedToName', 'respondedAt', 'respondedBy', 'respondedByName', 'resolutionNotes', 'responderNotes'];
      const updateFields = Object.keys(data).filter(f => allowedFields.includes(f));
      
      if (updateFields.length > 0) {
        const setClause = updateFields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        await pool.query(`UPDATE alerts SET ${setClause}, updated_at = now() WHERE id = $1`, [docId, ...updateFields.map(f => data[f])]);
        
        const result = await pool.query("SELECT a.*, u.name as \"residentName\" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.id = $1", [docId]);
        const alert = result.rows[0];
        socketService.emitToAll("alert_update", { 
          type: 'update', 
          alert: { ...alert, location: typeof alert.location === 'string' ? JSON.parse(alert.location) : alert.location, timestamp: alert.created_at }
        });
      }
      return res.json({ success: true });
    }

    response.error(res, "Path not mapped", "NOT_FOUND", 404);
  } catch (err: any) {
    response.error(res, err.message);
  }
};

export const deleteSync = async (req: AuthRequest, res: Response) => {
  const { path: fullPath, id } = req.body;
  if (!fullPath) return response.error(res, "Path required", "BAD_REQUEST", 400);

  const parts = (fullPath as string).split('/');
  const collection = parts[0];
  const docId = id || parts[1];

  try {
    const deletable = ['alerts', 'system_broadcasts', 'tanod_activity_logs', 'incidents'];
    if (deletable.includes(collection) && docId) {
      await pool.query(`DELETE FROM ${collection} WHERE id = $1`, [docId]);
      return res.json({ success: true });
    }
    response.error(res, `Delete not supported for: ${fullPath}`, "BAD_REQUEST", 400);
  } catch (err: any) {
    response.error(res, err.message);
  }
};
