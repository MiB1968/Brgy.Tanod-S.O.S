// src/server/services/incidentService.ts
import { analyzeIncident } from './aiService';
import { AppError } from '../middleware/error';
import { getIO } from '../sockets';
import { SOCKET_EVENTS } from '../constants';
import { LocationUpdate } from '../types';
import { pool } from '../db/index';

// In-memory cache for duplicate prevention (can be replaced with Redis later)
const recentSOS = new Map<string, number>(); // userId → timestamp

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
  }) {
    const { reporterId, barangayId, description, latitude, longitude } = data;

    // === Duplicate SOS Protection ===
    const lastSOS = recentSOS.get(reporterId);
    if (lastSOS && Date.now() - lastSOS < 60_000) { // 60 seconds
      throw new AppError("You already sent an SOS recently. Please wait.", 429, "RATE_LIMITED");
    }
    recentSOS.set(reporterId, Date.now());
    
    // Check for existing active alert from same user
    const activeCheck = await pool.query(
      "SELECT id FROM alerts WHERE resident_id = $1 AND status IN ('pending', 'active', 'responding') LIMIT 1",
      [reporterId]
    );

    if (activeCheck.rows.length > 0) {
      throw new AppError("You already have an active SOS alert. Please use the chat to provide updates.", 409, "CONFLICT");
    }

    // Calculate nearest Tanod distance
    let nearestTanodDistanceKm = 1.2; // default
    try {
      const nearestData = await this.findNearestResponders(barangayId, latitude, longitude, 1);
      if (nearestData && nearestData.length > 0) {
        nearestTanodDistanceKm = nearestData[0].distance_metres / 1000;
      }
    } catch (e) {
      console.warn("[SOS] Could not calculate nearest responder distance", e);
    }

    // Guardian AI Analysis
    const aiAnalysis = await analyzeIncident(
      description,
      data.initialType,
      nearestTanodDistanceKm,
      `inc_${Date.now()}`
    );

    const finalSeverity = aiAnalysis.severityScore || 3;
    const result = await pool.query(
      `INSERT INTO alerts (
        resident_id, type, location, description, status, severity_score, ai_analysis, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, now(), now()) RETURNING *`,
      [
        reporterId, 
        aiAnalysis.incidentType || data.initialType || 'OTHER', 
        JSON.stringify({ lat: latitude, lng: longitude }), 
        description || '', 
        finalSeverity, 
        JSON.stringify(aiAnalysis)
      ]
    );

    const alert = result.rows[0];

    const incident = {
      id: alert.id,
      reporterId,
      barangayId,
      description,
      latitude,
      longitude,
      status: 'PENDING' as const,
      aiAnalysis,
      photos: data.photos || [],
      voiceClip: data.voiceClip,
      createdAt: alert.created_at,
      updatedAt: alert.updated_at,
    };

    // Real-time broadcast
    if (getIO()) {
      getIO().to('responders').emit(SOCKET_EVENTS.NEW_INCIDENT, incident);
      if (barangayId && barangayId !== 'default') {
        getIO().to(`barangay_${barangayId}`).emit(SOCKET_EVENTS.NEW_INCIDENT, incident);
      }
    }

    return incident;
  },

  async cancelSOS(incidentId: string, userId: string, userRole: string) {
    const alertCheck = await pool.query(
      "SELECT resident_id, status FROM alerts WHERE id = $1",
      [incidentId]
    );

    if (alertCheck.rows.length === 0) {
      throw new AppError("Alert not found", 404, "NOT_FOUND");
    }

    const alert = alertCheck.rows[0];
    if (alert.resident_id !== userId && userRole !== 'ADMIN' && userRole !== 'CAPTAIN' && userRole !== 'admin' && userRole !== 'superadmin') {
      throw new AppError("Permission denied", 403, "FORBIDDEN");
    }

    if (alert.status === 'resolved' || alert.status === 'cancelled') {
        throw new AppError("Alert is already completed", 409, "CONFLICT");
    }

    const result = await pool.query(
      "UPDATE alerts SET status = 'cancelled', updated_at = now() WHERE id = $1 RETURNING *",
      [incidentId]
    );

    const updated = {
      id: incidentId,
      status: 'CANCELLED',
      updatedAt: result.rows[0].updated_at,
    };

    if (getIO()) {
      getIO().to(`incident_${incidentId}`).emit(SOCKET_EVENTS.INCIDENT_UPDATED, { alert: updated });
      getIO().to('responders').emit(SOCKET_EVENTS.INCIDENT_UPDATED, { alert: updated });
    }
    
    return updated;
  },

  async getActiveIncidents(barangayId?: string, userRole?: string) {
    return this.getActiveAlerts();
  },

  async getActiveAlerts() {
    const result = await pool.query(
      "SELECT a.*, u.name as \"residentName\" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.status IN ('pending', 'active', 'responding') ORDER BY a.created_at DESC"
    );
    
    return result.rows.map(a => ({
      ...a,
      location: typeof a.location === 'string' ? JSON.parse(a.location) : a.location,
      timestamp: a.created_at
    }));
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

    for (const loc of activeLocations) {
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

