import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../db/index';
import * as socketService from '../sockets/index';
import * as response from '../utils/response';
import { ShiftRepository } from '../db/repositories/ShiftRepository';
import { z } from 'zod';
import { config } from '../config/index';
import { encryptField, decryptField } from '../utils/crypto';

const auditLogArchiveSchema = z.object({
  session_date: z.string().min(1),
  archived_at: z.string().optional(),
  archived_by: z.string().optional(),
  log_count: z.number().int().min(0).default(0),
  total_incidents: z.number().int().min(0).default(0),
  resolved_count: z.number().int().min(0).default(0),
  unresolved_count: z.number().int().min(0).default(0),
  log_entries: z.array(z.any()).default([]),
  notes: z.string().optional(),
});

export const getSync = async (req: AuthRequest, res: Response) => {
  const { path: fullPath } = req.query;
  console.log(`[SYNC] getSync requested: ${fullPath} from user: ${req.user?.id} role: ${req.user?.role}`);

  if (!fullPath) return response.error(res, "Path required", "BAD_REQUEST", 400);

  const fullPathStr = decodeURIComponent(fullPath as string);
  const [basePath, searchParams] = fullPathStr.split('?');
  const parts = basePath.split('/');
  const collection = parts[0];
  const id = parts[1];
  const subCollection = parts[2];

  if (id === 'undefined' || id === 'null') {
    return response.error(res, "Invalid ID parameter", "BAD_REQUEST", 400);
  }

  try {
    const userRole = req.user?.role;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isTanod = userRole === 'tanod' || isAdmin;

    if (collection === 'system') {
      if (id === 'siren') {
        const result = await pool.query("SELECT data FROM system_config WHERE key = 'siren'");
        return res.json(result.rows[0]?.data || { sirenActive: false });
      }
      if (id === 'developer') {
        const result = await pool.query("SELECT data FROM system_config WHERE key = 'developer'");
        return res.json(result.rows[0]?.data || { name: 'Ruben Llego O.', avatarUrl: null });
      }
      if (id === 'twilio') {
        const result = await pool.query("SELECT data FROM system_config WHERE key = 'twilio'");
        return res.json(result.rows[0]?.data || {
          enabled: config.twilio.enabled,
          fallbackDelayMinutes: config.twilio.fallbackDelayMinutes,
          maxRecipients: config.twilio.maxRecipients
        });
      }
    }

    if (collection === 'alerts' || collection === 'active_alerts') {
      if (id && subCollection === 'messages') {
        const result = await pool.query(
          "SELECT * FROM alert_messages WHERE alert_id = $1 ORDER BY timestamp ASC",
          [id]
        );
        return res.json(result.rows);
      }
      
      // Residents can only see their own alerts, Tanods/Admins see all
      if (id) {
        const result = await pool.query(
          "SELECT a.*, u.name as \"residentName\" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.id = $1", 
          [id]
        );
        const alert = result.rows[0];
        if (!alert) return response.error(res, "Alert not found", "NOT_FOUND", 404);
        
        if (!isTanod && alert.resident_id !== req.user?.id) {
          return response.error(res, "Unauthorized access to alert details", "FORBIDDEN", 403);
        }

        return res.json({
          ...alert,
          aiAnalysis: typeof alert.ai_analysis === 'string' ? JSON.parse(alert.ai_analysis) : alert.ai_analysis,
          location: typeof alert.location === 'string' ? JSON.parse(alert.location) : alert.location,
          timestamp: alert.created_at
        });
      } else {
        let query = "SELECT a.*, u.name as \"residentName\" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id ORDER BY a.created_at DESC LIMIT 100";
        let params: any[] = [];

        if (!isTanod) {
          query = "SELECT a.*, u.name as \"residentName\" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.resident_id = $1 ORDER BY a.created_at DESC LIMIT 100";
          params = [req.user?.id];
        }

        const result = await pool.query(query, params);
        return res.json(result.rows.map(a => ({
          ...a,
          aiAnalysis: typeof a.ai_analysis === 'string' ? JSON.parse(a.ai_analysis) : a.ai_analysis,
          location: typeof a.location === 'string' ? JSON.parse(a.location) : a.location,
          timestamp: a.created_at
        })));
      }
    }

    if (collection === 'incidents') {
      if (!isTanod) return response.error(res, "Unauthorized", "FORBIDDEN", 403);
      const result = await pool.query("SELECT * FROM incidents ORDER BY timestamp DESC LIMIT 100");
      return res.json(result.rows.map(i => ({ 
        id: i.id, 
        ...i,
        tanodName: i.tanod_name,
        citizen: i.citizen_name || 'Citizen',
        date: i.timestamp ? new Date(i.timestamp).toISOString().split('T')[0] : 'Unknown',
        time: i.timestamp ? new Date(i.timestamp).toLocaleTimeString() : 'Unknown'
      })));
    }

    if (collection === 'users' || collection === 'residents') {
      if (searchParams?.includes('role=tanod')) {
        const result = await pool.query("SELECT id, email, name, role, status, last_active FROM users WHERE role = 'tanod'");
        return res.json(result.rows);
      }
      if (id) {
        // Residents can only see their own profile
        if (!isTanod && id !== req.user?.id) return response.error(res, "Forbidden", "FORBIDDEN", 403);
        const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
        const user = result.rows[0];
        if (user && collection === 'residents') {
           const resInfo = await pool.query("SELECT * FROM residents WHERE id = $1", [id]);
           const residentData = resInfo.rows[0];
           if (residentData) {
              residentData.blood_type = decryptField(residentData.blood_type);
              residentData.medical_conditions = decryptField(residentData.medical_conditions);
              residentData.allergies = decryptField(residentData.allergies);
              residentData.medications = decryptField(residentData.medications);

              // Map to camelCase for frontend consistency if needed, but sync usually keeps snake_case
              residentData.bloodType = residentData.blood_type;
              residentData.medicalConditions = residentData.medical_conditions;
              residentData.allergies = residentData.allergies;
              residentData.medications = residentData.medications;
           }
           return res.json({ ...user, ...residentData });
        }
        return res.json(user || null);
      }
      // Only Admins/Tanods can list residents
      if (!isTanod) return response.error(res, "Forbidden", "FORBIDDEN", 403);
      if (collection === 'residents') {
        const result = await pool.query("SELECT u.id, u.email, u.name, u.role, u.status, r.* FROM users u JOIN residents r ON u.id = r.id WHERE u.role = 'resident'");
        return res.json(result.rows.map(r => ({
          ...r,
          blood_type: decryptField(r.blood_type),
          medical_conditions: decryptField(r.medical_conditions),
          allergies: decryptField(r.allergies),
          medications: decryptField(r.medications),
          bloodType: decryptField(r.blood_type),
          medicalConditions: decryptField(r.medical_conditions)
        })));
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
      if (!isAdmin) return response.error(res, "Admin Access Required", "FORBIDDEN", 403);
      const result = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100");
      return res.json(result.rows);
    }

    if (collection === 'audit_log_archives') {
      if (!isAdmin) return response.error(res, "Admin Access Required", "FORBIDDEN", 403);
      const result = await pool.query("SELECT * FROM audit_log_archives ORDER BY archived_at DESC LIMIT 50");
      return res.json(result.rows.map(row => ({
         ...row,
         log_entries: typeof row.log_entries === 'string' ? JSON.parse(row.log_entries) : (row.log_entries || [])
      })));
    }

    if (collection === 'tanod_activity_logs') {
      if (!isTanod) return response.error(res, "Tanod/Admin Access Required", "FORBIDDEN", 403);
      const result = await pool.query("SELECT * FROM tanod_activity_logs ORDER BY timestamp DESC LIMIT 100");
      return res.json(result.rows.map(l => ({
        id: l.id,
        ...l,
        location: typeof l.location === 'string' ? JSON.parse(l.location) : l.location
      })));
    }

    if (collection === 'witness_invites') {
      let query = "SELECT * FROM witness_invites";
      let params: any[] = [];
      
      if (searchParams) {
        const urlParams = new URLSearchParams(searchParams);
        const witnessUserId = urlParams.get('witnessUserId');
        const alertId = urlParams.get('alertId');
        const status = urlParams.get('status');
        
        const conditions = [];
        if (witnessUserId) {
          conditions.push(`witness_user_id = $${params.length + 1}`);
          params.push(witnessUserId);
        }
        if (alertId) {
          conditions.push(`alert_id = $${params.length + 1}`);
          params.push(alertId);
        }
        if (status) {
          conditions.push(`status = $${params.length + 1}`);
          params.push(status);
        }
        
        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(' AND ');
        }
      }
      
      const result = await pool.query(query, params);
      return res.json(result.rows.map(r => ({
        id: r.id,
        alertId: r.alert_id,
        witnessUserId: r.witness_user_id,
        status: r.status,
        timestamp: r.timestamp
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

    if (collection === 'shifts') {
      const results = await ShiftRepository.getAll();
      return res.json(results);
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
  const subCollection = parts[2];

  if (docId === 'undefined' || docId === 'null') {
    return response.error(res, "Invalid ID parameter", "BAD_REQUEST", 400);
  }

  try {
    const userRole = req.user?.role;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isTanod = userRole === 'tanod' || isAdmin;

    if (collection === 'system') {
      if (docId === 'siren' || docId === 'developer' || docId === 'twilio') {
        if (!isTanod) return response.error(res, `Full clearance required for ${docId === 'siren' ? 'Siren' : 'Developer'} Control`, "FORBIDDEN", 403);
        if (docId === 'twilio' && !isAdmin) return response.error(res, "Admin credentials required to configure Twilio settings", "FORBIDDEN", 403);
        await pool.query(
          "INSERT INTO system_config (key, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET data = $2, updated_at = now()",
          [docId, JSON.stringify(data)]
        );
        if (docId === 'siren') socketService.emitToAll("siren_update", data);
        if (docId === 'twilio') socketService.emitToAll("twilio_update", data);
        return res.json({ success: true });
      }
    }

    if (collection === 'patrol_sessions') {
      if (!isTanod) return response.error(res, "Access Denied", "FORBIDDEN", 403);
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
      if (!isTanod) return response.error(res, "Access Denied", "FORBIDDEN", 403);
      await pool.query(
        "INSERT INTO tanod_activity_logs (tanod_id, tanod_name, type, timestamp, details, location) VALUES ($1, $2, $3, $4, $5, $6)",
        [data.tanodId, data.tanodName, data.type, data.timestamp, data.details, JSON.stringify(data.location || null)]
      );
      return res.json({ success: true });
    }

    if (collection === 'users') {
      // User can only update themselves unless they are admin
      if (!isAdmin && docId !== req.user?.id) return response.error(res, "Forbidden", "FORBIDDEN", 403);
      
      const fieldMapping: Record<string, string> = { status: 'status', role: 'role', name: 'name', email: 'email' };
      // Prevent residents from changing their own role/status
      if (!isAdmin) {
        delete data.role;
        delete data.status;
      }

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
      // Residents can only update themselves unless they are admin/tanod
      if (!isTanod && docId !== req.user?.id) return response.error(res, "Forbidden", "FORBIDDEN", 403);

      const fieldMapping: Record<string, string> = {
        name: 'name', phone: 'phone', address: 'address', status: 'status',
        houseNumber: 'house_number', householdSize: 'household_size',
        bloodType: 'blood_type', medicalConditions: 'medical_conditions',
        allergies: 'allergies', medications: 'medications',
        emergencyContactName: 'emergency_contact_name', emergencyContactPhone: 'emergency_contact_phone',
        gpsLat: 'gps_lat', gpsLng: 'gps_lng', isVerified: 'is_verified',
        verificationDate: 'verification_date', rejectionReason: 'rejection_reason'
      };

      const encryptedFields = ['blood_type', 'medical_conditions', 'allergies', 'medications'];

      // Prevent non-admins from verifying or rejecting
      if (!isTanod) {
        delete data.status;
        delete data.is_verified;
        delete data.verification_date;
        delete data.rejection_reason;
      }

      const safeData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
         const mapped = fieldMapping[key] || fieldMapping[key.replace(/([A-Z])/g, "_$1").toLowerCase()];
         if (mapped) {
           safeData[mapped] = encryptedFields.includes(mapped) ? encryptField(data[key]) : data[key];
         }
      });

      const safeFields = Object.keys(safeData);
      if (safeFields.length === 0) return response.error(res, "No valid fields to update", "BAD_REQUEST", 400);

      const setClause = safeFields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      await pool.query(`UPDATE residents SET ${setClause} WHERE id = $1`, [docId, ...safeFields.map(f => safeData[f])]);

      let isOutsideBarangay = undefined;
      // Run geofence check if GPS location was updated
      if (safeData.gps_lat !== undefined && safeData.gps_lng !== undefined) {
        try {
          const { checkAndUpdateGeofence } = await import('../services/geofencingService');
          const result = await checkAndUpdateGeofence(docId as string, Number(safeData.gps_lat), Number(safeData.gps_lng));
          if (result !== undefined) {
            isOutsideBarangay = result.is_outside_barangay;
          }
        } catch (geofenceErr) {
          console.warn(`Geofence error during resident update: ${geofenceErr}`);
        }
      }

      // Decrypt for the response/socket
      const responseData = { ...safeData };
      encryptedFields.forEach(f => {
        if (responseData[f]) responseData[f] = decryptField(responseData[f]);
      });

      socketService.emitToAll("resident_update", { 
        id: docId, 
        ...responseData,
        is_outside_barangay: isOutsideBarangay,
      });
      return res.json({ success: true, is_outside_barangay: isOutsideBarangay, data: responseData });
    }

    if (collection === 'patrols') {
      if (!isTanod) return response.error(res, "Access Denied", "FORBIDDEN", 403);
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
      if (!isTanod) return response.error(res, "Admin Access Required", "FORBIDDEN", 403);
      if (docId) {
        const fieldMapping: Record<string, string> = {
          isActive: 'isactive',
          approvalStatus: 'approval_status',
          adminId: 'admin_id',
          adminName: 'admin_name',
          type: 'type'
        };
        const updateFields = Object.keys(data).filter(f => fieldMapping[f]);
        if (updateFields.length === 0) return response.error(res, "No valid fields to update", "BAD_REQUEST", 400);
        
        const setClause = updateFields.map((f, i) => `${fieldMapping[f]} = $${i + 2}`).join(', ');
        await pool.query(`UPDATE system_broadcasts SET ${setClause} WHERE id = $1`, [docId, ...updateFields.map(f => data[f])]);
        
        const result = await pool.query("SELECT * FROM system_broadcasts WHERE id = $1", [docId]);
        socketService.emitToAll("broadcast_update", result.rows[0]);
        return res.json({ success: true, broadcast: result.rows[0] });
      } else {
        const result = await pool.query(
          "INSERT INTO system_broadcasts (admin_id, admin_name, message, type, isactive, timestamp, approval_status, ai_recommendation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
          [data.adminId, data.adminName, data.message, data.type, data.isActive ?? false, data.timestamp || new Date().toISOString(), data.approvalStatus || 'pending', data.aiRecommendation ? JSON.stringify(data.aiRecommendation) : null]
        );
        socketService.emitToAll("broadcast_update", result.rows[0]);
        return res.json({ success: true, broadcast: result.rows[0] });
      }
    }

    if (collection === 'incidents') {
      if (!isTanod) return response.error(res, "Access Denied", "FORBIDDEN", 403);
      await pool.query(
        `INSERT INTO incidents (alert_id, tanod_id, tanod_name, citizen_name, timestamp, type, location, gps_location, description, persons_involved, actions_taken, status, responded_at, resolved_at, admin_on_duty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          data.alertId || null, 
          // If tanodId is passed as "Name (Handle)", it wont be a valid UUID. 
          // We need to resolve the ID from name/handle or set to null if not a valid UUID.
          (data.tanodId && data.tanodId.length === 36 && data.tanodId.includes('-')) ? data.tanodId : null, 
          data.tanodName, 
          data.citizenName || data.citizen || 'Unknown',
          data.timestamp || new Date().toISOString(), 
          data.type, 
          data.location, 
          JSON.stringify(data.gpsLocation || null), 
          data.description, 
          data.personsInvolved || null, 
          data.actionsTaken || null, 
          data.status || 'pending',
          data.respondedAt || null,
          data.resolvedAt || null,
          (data.adminOnDuty && data.adminOnDuty.length === 36 && data.adminOnDuty.includes('-')) ? data.adminOnDuty : null
        ]
      );
      return res.json({ success: true });
    }

    if (collection === 'shifts') {
      if (!isAdmin) return response.error(res, "Admin Access Required", "FORBIDDEN", 403);
      if (docId) {
        await ShiftRepository.update(docId, data);
      } else {
        await ShiftRepository.create(data);
      }
      socketService.emitToAll("shift_update", { id: docId || 'new', data });
      return res.json({ success: true });
    }

    if (collection === 'alerts') {
      if (subCollection === 'messages') {
        const result = await pool.query(
          "INSERT INTO alert_messages (alert_id, sender_id, sender_name, message, type, timestamp) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
          [docId, req.user?.id, data.senderName || 'User', data.message, data.type || 'text', data.timestamp || new Date().toISOString()]
        );
        socketService.emitToRoom(`incident_${docId}`, "new_message", result.rows[0]);
        return res.json({ success: true, id: result.rows[0].id });
      }

      // Permission required to update an alert (Tanod/Admin or Owner for specific fields)
      const alertCheck = await pool.query("SELECT resident_id FROM alerts WHERE id = $1", [docId]);
      if (alertCheck.rows.length === 0) return response.error(res, "Alert not found", "NOT_FOUND", 404);
      
      const isOwner = alertCheck.rows[0].resident_id === req.user?.id;
      if (!isTanod && !isOwner) return response.error(res, "Access Denied", "FORBIDDEN", 403);

      // Map camelCase fields to snake_case columns
      const fieldMap: Record<string, string> = {
        'status': 'status',
        'severityScore': 'severity_score',
        'severity_score': 'severity_score',
        'aiAnalysis': 'ai_analysis',
        'ai_analysis': 'ai_analysis',
        'resolvedAt': 'resolved_at',
        'resolved_at': 'resolved_at',
        'assignedTo': 'assigned_to',
        'assigned_to': 'assigned_to',
        'assignedToName': 'assigned_to_name',
        'assigned_to_name': 'assigned_to_name',
        'respondedAt': 'responded_at',
        'responded_at': 'responded_at',
        'respondedBy': 'responded_by',
        'responded_by': 'responded_by',
        'respondedByName': 'responded_by_name',
        'responded_by_name': 'responded_by_name',
        'resolutionNotes': 'resolution_notes',
        'resolution_notes': 'resolution_notes',
        'responderNotes': 'responder_notes',
        'responder_notes': 'responder_notes',
        'reviewReason': 'review_reason',
        'review_reason': 'review_reason',
        'description': 'description',
        'location': 'location',
        'type': 'type'
      };

      const allowedFields = isTanod 
        ? Object.keys(fieldMap)
        : ['description', 'location', 'type']; // Residents can only update their own SOS details

      const updateFields = Object.keys(data).filter(f => allowedFields.includes(f));
      
      if (updateFields.length > 0) {
        const setClause = updateFields.map((f, i) => `${fieldMap[f] || f} = $${i + 2}`).join(', ');
        const values = updateFields.map(f => {
           const val = data[f];
           if (f === 'location' || f === 'aiAnalysis' || f === 'ai_analysis') {
              return typeof val === 'object' ? JSON.stringify(val) : val;
           }
           return val;
        });
        await pool.query(`UPDATE alerts SET ${setClause}, updated_at = now() WHERE id = $1`, [docId, ...values]);
        
        const result = await pool.query("SELECT a.*, u.name as \"residentName\" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.id = $1", [docId]);
        const alert = result.rows[0];
        // Remap snake_case to camelCase for websocket
        const formattedAlert = {
           ...alert,
           residentId: alert.resident_id,
           assignedTo: alert.assigned_to,
           assignedToName: alert.assigned_to_name,
           respondedAt: alert.responded_at,
           respondedBy: alert.responded_by,
           respondedByName: alert.responded_by_name,
           resolvedAt: alert.resolved_at,
           resolutionNotes: alert.resolution_notes,
           responderNotes: alert.responder_notes,
           severityScore: alert.severity_score,
           reviewReason: alert.review_reason,
           aiAnalysis: typeof alert.ai_analysis === 'string' ? JSON.parse(alert.ai_analysis) : alert.ai_analysis,
           location: typeof alert.location === 'string' ? JSON.parse(alert.location) : alert.location,
           timestamp: alert.created_at
        };
        socketService.emitToAll("alert_update", { 
          type: 'update', 
          alert: formattedAlert
        });
      }
      return res.json({ success: true });
    }

    if (collection === 'witness_invites') {
      if (docId) {
        const allowedFields = ['status'];
        const updateFields = Object.keys(data).filter(f => allowedFields.includes(f));
        if (updateFields.length > 0) {
          const setClause = updateFields.map((f, i) => `${f === 'status' ? 'status' : f} = $${i + 2}`).join(', ');
          await pool.query(`UPDATE witness_invites SET ${setClause} WHERE id = $1`, [docId, ...updateFields.map(f => data[f])]);
        }
      } else {
        await pool.query(
          "INSERT INTO witness_invites (alert_id, witness_user_id, status, timestamp) VALUES ($1, $2, $3, $4)",
          [data.alertId, data.witnessUserId, data.status || 'pending', data.timestamp || new Date().toISOString()]
        );
      }
      return res.json({ success: true });
    }

    if (collection === 'audit_logs') {
      if (!isTanod) return response.error(res, "Access Denied", "FORBIDDEN", 403);
      await pool.query(
        `INSERT INTO audit_logs (incident_id, type, status, citizen_id, tanod_assigned, location_lat, location_lng, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [data.incident_id, data.type, data.status, data.citizen_id, data.tanod_assigned, data.location_lat, data.location_lng, data.notes, data.created_at || new Date().toISOString()]
      );
      return res.json({ success: true });
    }

    if (collection === 'audit_log_archives') {
      if (!isAdmin) return response.error(res, "Access Denied", "FORBIDDEN", 403);

      const parsed = auditLogArchiveSchema.safeParse(data);
      if (!parsed.success) {
        return response.error(
          res,
          `Invalid archive data: ${parsed.error.issues.map(i => i.message).join(', ')}`,
          'BAD_REQUEST',
          400
        );
      }

      const d = parsed.data;
      await pool.query(
        `INSERT INTO audit_log_archives
           (session_date, archived_at, archived_by, log_count, total_incidents,
            resolved_count, unresolved_count, log_entries, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          d.session_date,
          d.archived_at || new Date().toISOString(),
          d.archived_by,
          d.log_count,
          d.total_incidents,
          d.resolved_count,
          d.unresolved_count,
          JSON.stringify(d.log_entries),
          d.notes,
        ]
      );
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

  if (docId === 'undefined' || docId === 'null') {
    return response.error(res, "Invalid ID parameter", "BAD_REQUEST", 400);
  }

  try {
    const userRole = req.user?.role;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isTanod = userRole === 'tanod' || isAdmin;

    const DELETABLE_COLLECTIONS: Record<string, string> = {
      alerts: 'alerts',
      system_broadcasts: 'system_broadcasts',
      tanod_activity_logs: 'tanod_activity_logs',
      incidents: 'incidents',
      audit_log_archives: 'audit_log_archives'
    };

    if ((Object.keys(DELETABLE_COLLECTIONS).includes(collection) || collection === 'shifts') && docId) {
      if (!isTanod) return response.error(res, "Administrative clearance required for deletion", "FORBIDDEN", 403);
      
      if (collection === 'shifts') {
        await ShiftRepository.delete(docId);
        socketService.emitToAll("shift_update", { id: docId, deleted: true });
      } else {
        const tableName = DELETABLE_COLLECTIONS[collection];
        await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [docId]);
      }
      return res.json({ success: true });
    }
    response.error(res, `Delete not supported for: ${fullPath}`, "BAD_REQUEST", 400);
  } catch (err: any) {
    response.error(res, err.message);
  }
};
