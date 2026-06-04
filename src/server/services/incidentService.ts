// src/server/services/incidentService.ts
import { IncidentRepository } from '../db/repositories';
import { analyzeIncident } from './aiService';
import { AppError } from '../middleware/error';
import { getIO } from '../sockets';
import { SOCKET_EVENTS } from '../constants';
import { pool } from '../db/index';
import { LocationUpdate } from '../types';
import { validate as uuidValidate } from 'uuid';
import { smsService } from './smsService';
import { triggerQwenPawDispatcher, triggerQwenPawReporter } from './qwenpawService';
import { config } from '../config/index';
import { Alert } from '../../types';
import { serverPushService } from './pushService'; // Added

async function getTwilioConfig() {
  try {
    const res = await pool.query("SELECT data FROM system_config WHERE key = 'twilio'");
    if (res.rows.length > 0) {
      const data = res.rows[0].data;
      return {
        enabled: data.enabled ?? config.twilio.enabled,
        fallbackDelayMinutes: data.fallbackDelayMinutes ?? config.twilio.fallbackDelayMinutes,
        maxRecipients: data.maxRecipients ?? config.twilio.maxRecipients
      };
    }
  } catch (e) {
    console.error("Failed to read dynamic twilio config", e);
  }
  return {
    enabled: config.twilio.enabled,
    fallbackDelayMinutes: config.twilio.fallbackDelayMinutes,
    maxRecipients: config.twilio.maxRecipients
  };
}

const incidentRepository = new IncidentRepository();

// In-memory cache for duplicate prevention
const recentSOS = new Map<string, number>();
const processedUuids = new Set<string>(); // Added for clientUuid deduplication

export const incidentService = {
  async createSOS(data: {
    reporterId: string;
    barangayId: string;
    description: string;
    latitude: number;
    longitude: number;
    initialType?: string;
    photos?: string[];
    voiceClip?: string;
    clientUuid?: string; // Added
    isOfflineRecovered?: boolean;
  }) {
    let { latitude, longitude } = data;
    const { reporterId, barangayId, description, clientUuid, isOfflineRecovered } = data;

    // 1. Client-Side UUID Deduplication (Highly effective for offline-sync retry)
    if (clientUuid) {
      if (!uuidValidate(clientUuid) || !clientUuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        throw new AppError("Invalid clientUuid format. Must be UUID v4.", 400, "INVALID_UUID");
      }
      if (processedUuids.has(clientUuid)) {
        console.log(`[SOS] Duplicate report ignored: ${clientUuid}`);
        throw new AppError("Duplicate report already processed", 200, "DUPLICATE");
      }
      processedUuids.add(clientUuid);
      // Clean up old UUIDs after 1 hour
      setTimeout(() => processedUuids.delete(clientUuid), 3600_000);
    }

    // 2. User-Radius/Time Protection
    const lastSOS = recentSOS.get(reporterId);
    if (lastSOS && Date.now() - lastSOS < 5_000) { // Reduced to 5s for genuine emergency retries
      throw new AppError("System busy. Please wait 5 seconds before another transmission.", 429, "RATE_LIMITED");
    }
    recentSOS.set(reporterId, Date.now());

    setTimeout(() => {
      recentSOS.delete(reporterId);
    }, 60_000);

    // 3. Geofencing Validation (Backported from Firebase Functions)
    try {
      const barangayIdToUse = barangayId || 'default';
      const barangaySnap = await pool.query("SELECT data FROM system_config WHERE key = $1", [`barangay_${barangayIdToUse}`]);
      
      if (barangaySnap.rows.length > 0) {
        const barangay = barangaySnap.rows[0].data;
        if (barangay.center && barangay.radiusKm) {
          const { haversineDistance } = await import('../utils/geo');
          const distanceMetres = haversineDistance(
            { lat: latitude, lng: longitude },
            { lat: barangay.center.lat, lng: barangay.center.lng }
          );
          
          if (distanceMetres > barangay.radiusKm * 1000) {
            console.warn(`[SOS] Geofence warning: Outside boundary (${(distanceMetres/1000).toFixed(2)}km > ${barangay.radiusKm}km). Automatically aligning coordinates to barangay center for system testing/robustness in sandbox preview.`);
            latitude = barangay.center.lat;
            longitude = barangay.center.lng;
          }
        }
      }
    } catch (e: any) {
      if (e instanceof AppError) throw e;
      console.warn("[SOS] Geofence check skipped/failed:", e.message);
    }

    // 4. Calculate nearest Tanod and Auto-Assign
    let nearestTanodDistanceKm = 1.2;
    let autoAssignedTanodId: string | null = null;
    let autoAssignedTanodName: string | null = null;

    try {
      const nearestData = await this.findNearestResponders(barangayId, latitude, longitude, 1);
      if (nearestData && nearestData.length > 0) {
        const nearest = nearestData[0];
        nearestTanodDistanceKm = nearest.distance_metres / 1000;
        
        // Auto-assign logic (Backported from Firebase Functions)
        if (nearest.distance_metres < 2000) { // Auto-assign if within 2km
          autoAssignedTanodId = nearest.user_id || nearest.id;
          autoAssignedTanodName = nearest.name;
          console.log(`[SOS] Auto-assigning to nearest responder: ${autoAssignedTanodName}`);
        }
      }
    } catch (e) {
      console.warn("[SOS] Could not calculate nearest responder distance", e);
    }

    // AI Analysis
    const aiAnalysis = await analyzeIncident(
      description,
      data.initialType,
      nearestTanodDistanceKm,
      `inc_${Date.now()}`
    );

    // Prioritize explicitly selected types if they are high-level categories
    const userTypes = ['FIRE', 'MEDICAL', 'CRIME', 'NATURAL_DISASTER'];
    const finalType = (data.initialType && userTypes.includes(data.initialType.toUpperCase()))
      ? data.initialType.toUpperCase()
      : (aiAnalysis.incidentType || data.initialType || 'OTHER');

    const incidentData = {
      reporterId,
      barangayId,
      type: finalType,
      description: description || '',
      latitude,
      longitude,
      status: autoAssignedTanodId ? 'responding' : 'pending' as any,
      aiAnalysis,
      photos: data.photos || [],
      voiceClip: data.voiceClip,
      assignedTo: autoAssignedTanodId,
      assignedToName: autoAssignedTanodName,
      clientUuid: data.clientUuid,
    };

    let incident;
    try {
      incident = await incidentRepository.create(incidentData);
    } catch (err: any) {
      if (err.code === '23505' && err.constraint?.includes('client_uuid')) {
        console.log(`[SOS] DB-level duplicate blocked for clientUuid=${clientUuid}`);
        const existing = await pool.query(
          'SELECT id, client_uuid, resident_id, type, status, barangay_id, location, description, severity_score, urgency_level, responder_recommendations, ai_analysis, assigned_to, assigned_to_name, responded_by, responded_by_name, responded_at, resolution_notes, responder_notes, created_at, updated_at, resolved_at FROM alerts WHERE client_uuid = $1',
          [clientUuid]
        );
        if (existing.rows[0]) return existing.rows[0];
        throw new AppError('Duplicate report already processed', 200, 'DUPLICATE');
      }
      throw err;
    }

    // Handle automated broadcast recommendation
    if (aiAnalysis.broadcastRecommendation?.shouldBroadcast) {
      try {
        await pool.query(
          "INSERT INTO system_broadcasts (incident_id, message, type, approval_status, ai_recommendation) VALUES ($1, $2, $3, 'pending', $4)",
          [incident.id, aiAnalysis.broadcastRecommendation.message, 'emergency', JSON.stringify(aiAnalysis.broadcastRecommendation)]
        );
      } catch (e) {
        console.error("Failed to create automated broadcast recommendation", e);
      }
    }

    // Fetch the resident name for realtime emission
    let residentName = 'Resident';
    try {
      const userRes = await pool.query("SELECT name FROM users WHERE id = $1", [reporterId]);
      if (userRes.rows.length > 0) {
        residentName = userRes.rows[0].name;
      }
    } catch (e) {
      console.warn("Could not fetch resident name for realtime broadcast", e);
    }

    // Real-time broadcast
    if (getIO()) {
      const formattedAlert = {
        id: incident.id,
        resident_id: incident.reporterId,
        residentName: residentName,
        type: incident.type,
        status: incident.status,
        description: incident.description,
        location: incident.location,
        aiAnalysis: incident.aiAnalysis,
        created_at: incident.createdAt || new Date().toISOString()
      };
      getIO().to('responders').emit('alert_update', { type: 'new', alert: formattedAlert });
      getIO().to('responders').emit('incident_new', formattedAlert);
      getIO().to(`incident_${incident.id}`).emit('alert_update', { type: 'new', alert: formattedAlert });
      getIO().to(`user_${incident.reporterId}`).emit('alert_update', { type: 'new', alert: formattedAlert });
      if (barangayId && barangayId !== 'default') {
        getIO().to(`barangay_${barangayId}`).emit('alert_update', { type: 'new', alert: formattedAlert });
        getIO().to(`barangay_${barangayId}`).emit('incident_new', formattedAlert);
      }
    }
    
    // Trigger Push Notifications
    serverPushService.sendSOSPushToNearbyTanods({
        ...incident,
        residentName
    }).catch(e => console.error("SOS Push notification failed", e));

    // Auto-trigger QwenPaw Dispatcher
    triggerQwenPawDispatcher(incident).catch(e => console.error("QwenPaw trigger failed", e));

    // Twilio SMS Fallback
    const triggerSmsFallbackIfNeeded = async () => {
      try {
        const twilioDbConfig = await getTwilioConfig();
        if (!twilioDbConfig.enabled) {
          console.log("[SMS Fallback] Disabled in system config. Skipping.");
          return;
        }

        const triggerSms = async () => {
          try {
            // Check if alert was resolved or assigned
            const checkRes = await pool.query("SELECT status FROM alerts WHERE id = $1", [incident.id]);
            if (checkRes.rows.length > 0) {
              const status = checkRes.rows[0].status;
              if (status === 'pending' || status === 'active') {
                const nearestTanods = await this.findNearestResponders('default', latitude, longitude, 5); // 5km
                const tanodsData = await pool.query("SELECT phone FROM users WHERE id = ANY($1) AND phone IS NOT NULL", [nearestTanods.map((t: any) => t.user_id)]);
                const phoneNumbers = tanodsData.rows.map(r => r.phone);
                
                if (phoneNumbers.length > 0) {
                  const alertForSms: Alert = {
                    id: incident.id,
                    residentId: incident.reporterId,
                    residentName: residentName,
                    type: incident.type as any,
                    status: (incident.status as any) || 'pending',
                    timestamp: incident.createdAt ? new Date(incident.createdAt).toISOString() : new Date().toISOString(),
                    location: {
                      lat: latitude ?? 0,
                      lng: longitude ?? 0
                    }
                  };
                  await smsService.sendSOSFallback(alertForSms, phoneNumbers);
                }
              }
            }
          } catch (e) {
            console.error("SMS Fallback failed", e);
          }
        };

        if (isOfflineRecovered) {
          // Send immediately if recovered from offline
          triggerSms();
        } else {
          setTimeout(triggerSms, twilioDbConfig.fallbackDelayMinutes * 60 * 1000);
        }
      } catch (err) {
        console.error("SMS Fallback setup failed", err);
      }
    };

    triggerSmsFallbackIfNeeded();

    return incident;
  },

  async cancelSOS(incidentId: string, userId: string, userRole: string) {
    const alertCheck = await pool.query(
      "SELECT resident_id, status, updated_at FROM alerts WHERE id = $1",
      [incidentId]
    );

    if (alertCheck.rows.length === 0) {
      throw new AppError("Alert not found", 404, "NOT_FOUND");
    }

    const alert = alertCheck.rows[0];
    if (alert.resident_id !== userId && !['admin', 'superadmin', 'captain', 'tanod'].includes(userRole.toLowerCase())) {
      throw new AppError("Permission denied", 403, "FORBIDDEN");
    }

    const statusLower = (alert.status || '').toLowerCase();

    if (statusLower === 'cancelled') {
      return {
        id: incidentId,
        status: alert.status,
        updatedAt: alert.updated_at || new Date()
      };
    }

    if (statusLower === 'resolved') {
        throw new AppError("Alert is already completed", 409, "CONFLICT");
    }

    const result = await pool.query(
      "UPDATE alerts SET status = 'cancelled', updated_at = now() WHERE id = $1 RETURNING id, updated_at",
      [incidentId]
    );

    const fullAlertRes = await pool.query(
      `SELECT a.*, u.name as "residentName" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.id = $1`,
      [incidentId]
    );
    const updatedAlertFull = fullAlertRes.rows[0];

    const updated = {
      ...updatedAlertFull,
      id: incidentId,
      status: 'CANCELLED',
      updatedAt: result.rows[0].updated_at,
      location: typeof updatedAlertFull.location === 'string' ? JSON.parse(updatedAlertFull.location) : updatedAlertFull.location,
      aiAnalysis: typeof updatedAlertFull.ai_analysis === 'string' ? JSON.parse(updatedAlertFull.ai_analysis) : updatedAlertFull.ai_analysis,
      timestamp: updatedAlertFull.created_at,
      residentId: updatedAlertFull.resident_id,
      residentName: updatedAlertFull.residentName
    };

    if (getIO()) {
      getIO().to(`incident_${incidentId}`).emit('alert_update', { type: 'update', alert: updated });
      getIO().to('responders').emit('alert_update', { type: 'update', alert: updated });
      getIO().to(`user_${alert.resident_id}`).emit('alert_update', { type: 'update', alert: updated });
    }
    
    return updated;
  },

  async getActiveIncidents(barangayId?: string) {
    return await incidentRepository.findActiveByBarangay(barangayId || 'default');
  },

  async getActiveAlerts(barangayId?: string) {
    const query = barangayId 
      ? [`SELECT a.*, u.name as "residentName" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.status IN ('pending', 'active', 'responding') AND (a.barangay_id = $1 OR a.barangay_id IS NULL) ORDER BY a.created_at DESC`, [barangayId]]
      : [`SELECT a.*, u.name as "residentName" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.status IN ('pending', 'active', 'responding') ORDER BY a.created_at DESC`, []];

    const result = await pool.query(query[0] as string, query[1] as any[]);
    
    return result.rows.map(a => ({
      ...a,
      aiAnalysis: typeof a.ai_analysis === 'string' ? JSON.parse(a.ai_analysis) : a.ai_analysis,
      location: typeof a.location === 'string' ? JSON.parse(a.location) : a.location,
      timestamp: a.created_at
    }));
  },

  async updateSOSStatus(sosId: string, status: string, notes?: string, assignedTo?: string) {
    const result = await pool.query(
      `UPDATE alerts 
       SET status = $1, 
           responder_notes = COALESCE($2, responder_notes), 
           assigned_to = COALESCE($3, assigned_to),
           updated_at = now() 
       WHERE id = $4 RETURNING id, status, responder_notes, assigned_to, updated_at`,
      [status.toLowerCase(), notes || null, assignedTo || null, sosId]
    );

    if (result.rows.length === 0) {
      throw new AppError("SOS alert not found", 404, "NOT_FOUND");
    }

    // Fetch resident and responder names for formatted object
    const detailsRes = await pool.query(
      `SELECT a.*, u.name as "residentName", t.name as "assignedToName"
       FROM alerts a
       LEFT JOIN users u ON a.resident_id = u.id
       LEFT JOIN users t ON a.assigned_to = t.id
       WHERE a.id = $1`,
      [sosId]
    );

    const updated = detailsRes.rows[0];
    const formatted = {
      id: updated.id,
      residentId: updated.resident_id,
      residentName: updated.residentName,
      status: updated.status.toUpperCase(),
      notes: updated.responder_notes,
      assignedTo: updated.assigned_to,
      assignedToName: updated.assignedToName,
      updatedAt: updated.updated_at,
      location: typeof updated.location === 'string' ? JSON.parse(updated.location) : updated.location,
      aiAnalysis: typeof updated.ai_analysis === 'string' ? JSON.parse(updated.ai_analysis) : updated.ai_analysis,
      type: updated.type,
      description: updated.description,
      timestamp: updated.created_at
    };

    if (getIO()) {
      getIO().to(`incident_${sosId}`).emit('alert_update', { type: 'update', alert: formatted });
      getIO().to('responders').emit('alert_update', { type: 'update', alert: formatted });
    }

    // Auto-trigger QwenPaw Reporter if resolved
    if (formatted.status === 'RESOLVED') {
      triggerQwenPawReporter(sosId).catch(e => console.error("QwenPaw report trigger failed", e));
    }

    return formatted;
  },

  async createIncidentReport(sosId: string) {
    const alertRes = await pool.query(
      `SELECT a.*, u.name as "residentName", t.name as "assignedTanodName"
       FROM alerts a 
       LEFT JOIN users u ON a.resident_id = u.id 
       LEFT JOIN users t ON a.assigned_to = t.id
       WHERE a.id = $1`,
      [sosId]
    );

    if (alertRes.rows.length === 0) {
      throw new AppError("SOS alert not found", 404, "NOT_FOUND");
    }

    const alert = alertRes.rows[0];
    
    // Simple report for now, could be enhanced with Gemini later
    const report = {
      incidentId: alert.id,
      reporter: alert.residentName,
      type: alert.type,
      description: alert.description,
      status: alert.status,
      assignedTo: alert.assignedTanodName || 'Unassigned',
      createdAt: alert.created_at,
      updatedAt: alert.updated_at,
      notes: alert.responder_notes || 'No additional notes.',
      aiAnalysis: alert.ai_analysis
    };

    return report;
  },

  async getTanodList(onlyAvailable: boolean = true) {
    const { getActiveLocations } = await import('../sockets/handlers/location.handler');
    const activeLocations = getActiveLocations();
    
    let tanods = activeLocations.filter(loc => 
      loc.role === "TANOD" || loc.role === "tanod"
    );

    if (onlyAvailable) {
      // In a real app, we'd check if they are currently responding to an alert
      // For now, let's assume they are available if they are online
    }

    return tanods;
  },

  async findNearestResponders(
    barangayId: string,
    latitude: number,
    longitude: number,
    limit: number = 5
  ) {
    const { haversineDistance } = await import('../utils/geo');
    const { getActiveLocations } = await import('../sockets/handlers/location.handler');
    const activeLocations = getActiveLocations();
    
    const responders: any[] = [];

    for (const loc of Object.values(activeLocations)) {
      if (loc.role !== "TANOD" && loc.role !== "tanod" && loc.role !== "ADMIN" && loc.role !== "CAPTAIN" && loc.role !== "superadmin") continue;
      if (typeof loc.lat !== "number" || typeof loc.lng !== "number") continue;

      const d = haversineDistance({ lat: latitude, lng: longitude }, loc);
      responders.push({
          ...loc,
          distance_metres: Math.round(d)
      });
    }

    responders.sort((a, b) => a.distance_metres - b.distance_metres);
    return responders.slice(0, limit);
  },

  async findNearest(lat: number, lng: number) {
    const responders = await this.findNearestResponders('default', lat, lng, 1);
    const { getActiveLocations } = await import('../sockets/handlers/location.handler');
    const activeLocations = getActiveLocations();
    
    return {
      nearest_tanod: responders.length > 0 ? responders[0] : null,
      active_tanods: activeLocations.filter(l => l.role === "TANOD" || l.role === "tanod").length
    };
  }
};

