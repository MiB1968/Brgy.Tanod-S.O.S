// src/server/services/incidentService.ts
import { IncidentRepository } from '../db/repositories';
import { analyzeIncident } from './aiService';
import { AppError } from '../middleware/error';
import { getIO } from '../sockets';
import { SOCKET_EVENTS } from '../constants';
import { pool } from '../db/index';
import { LocationUpdate } from '../types';

const incidentRepository = new IncidentRepository();

// In-memory cache for duplicate prevention
const recentSOS = new Map<string, number>();

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

    // Duplicate protection
    const lastSOS = recentSOS.get(reporterId);
    if (lastSOS && Date.now() - lastSOS < 60_000) {
      throw new AppError("You already sent an SOS recently. Please wait.", 429, "RATE_LIMITED");
    }
    recentSOS.set(reporterId, Date.now());

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

    // AI Analysis
    const aiAnalysis = await analyzeIncident(
      description,
      data.initialType,
      nearestTanodDistanceKm,
      `inc_${Date.now()}`
    );

    const incidentData = {
      reporterId,
      barangayId,
      type: aiAnalysis.incidentType || data.initialType || 'OTHER',
      description: description || '',
      latitude,
      longitude,
      status: 'PENDING' as const,
      aiAnalysis,
      photos: data.photos || [],
      voiceClip: data.voiceClip,
    };

    const incident = await incidentRepository.create(incidentData);

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
      getIO().to('responders').emit('alert_new', { alert: formattedAlert });
      getIO().to(`incident_${incident.id}`).emit('alert_new', { alert: formattedAlert });
      getIO().to(`user_${incident.reporterId}`).emit('alert_new', { alert: formattedAlert });
      if (barangayId && barangayId !== 'default') {
        getIO().to(`barangay_${barangayId}`).emit('alert_new', { alert: formattedAlert });
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
      getIO().to(`incident_${incidentId}`).emit('alert_update', { type: 'update', alert: updated });
      getIO().to('responders').emit('alert_update', { type: 'update', alert: updated });
      getIO().to(`user_${alert.resident_id}`).emit('alert_update', { type: 'update', alert: updated });
    }
    
    return updated;
  },

  async getActiveIncidents(barangayId?: string) {
    return await incidentRepository.findActiveByBarangay(barangayId || 'default');
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

