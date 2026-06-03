import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../db/index';
import * as response from '../utils/response';
import { aiService } from '../services/aiService';

export const getDashboardAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'tanod') {
      return response.error(res, "Administrative clearance required", "FORBIDDEN", 403);
    }

    let verified_residents = 0;
    let total_tanods = 0;
    let active_alerts = 0;
    const alertsByTypeMap: Record<string, number> = {};
    const alertsHistoryMap: Record<string, number> = {};

    try {
      // 1. Users overview from SQL
      const usersResult = await pool.query("SELECT role, status FROM users");
      usersResult.rows.forEach(row => {
        if (row.role === 'resident' && row.status === 'approved') verified_residents++;
        if (row.role === 'tanod') total_tanods++;
      });
      
      // 2. Alerts overview, types and history from SQL
      const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
      const alertsResult = await pool.query("SELECT id, status, type, location, created_at FROM alerts");
      
      alertsResult.rows.forEach(row => {
        // Active alerts
        const status = (row.status || '').toLowerCase();
        if (['pending', 'active', 'responding'].includes(status)) {
          active_alerts++;
        }
        
        // Alert types
        if (row.type) {
          alertsByTypeMap[row.type] = (alertsByTypeMap[row.type] || 0) + 1;
        }
        
        // History (last 7 days by date)
        const createdAt = row.created_at;
        const ts = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
        
        if (ts && ts >= sevenDaysAgo.getTime()) {
          const dateStr = new Date(ts).toISOString().split('T')[0];
          alertsHistoryMap[dateStr] = (alertsHistoryMap[dateStr] || 0) + 1;
        }
      });
      
    } catch (dbErr) {
      console.error("SQL Analytics Fetch Error:", dbErr);
    }

    const alertsByTypeRows = Object.keys(alertsByTypeMap).map(type => ({
      type,
      count: alertsByTypeMap[type]
    })).sort((a, b) => b.count - a.count);
    
    const alertsHistoryRows = Object.keys(alertsHistoryMap).map(day => ({
      day,
      count: alertsHistoryMap[day]
    })).sort((a, b) => a.day.localeCompare(b.day));

    return response.success(res, {
      overview: { verified_residents, total_tanods, active_alerts },
      alertsByType: alertsByTypeRows,
      alertsHistory: alertsHistoryRows
    });

  } catch (err: any) {
    console.error("Analytics Dashboard Error:", err);
    return response.error(res, "Failed to compile tactical analytics.", "SERVER_ERROR", 500);
  }
};

export const getIntelligenceBriefing = async (req: AuthRequest, res: Response) => {
  try {
    const { stats } = req.body;
    if (!stats) return response.error(res, "Stats data required for briefing");

    const brief = await aiService.generateIntelligenceBrief(stats);
    return response.success(res, { brief });
  } catch (err: any) {
    return response.error(res, err.message);
  }
};

export const getHeatmapData = async (req: AuthRequest, res: Response) => {
  try {
    const heatmap: any[] = [];
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    
    const alertsResult = await pool.query(
      "SELECT id, type, location, created_at FROM alerts WHERE created_at >= $1", 
      [thirtyDaysAgo]
    );

    alertsResult.rows.forEach(row => {
      let loc = row.location;
      if (typeof loc === 'string') {
        try {
          loc = JSON.parse(loc);
        } catch (e) {
          loc = null;
        }
      }
      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
        heatmap.push({
          id: row.id,
          type: row.type || 'UNKNOWN',
          lat: Number(loc.lat),
          lng: Number(loc.lng),
          timestamp: row.created_at
        });
      }
    });

    return res.json(heatmap);
  } catch (err: any) {
    console.error("Heatmap Analytics Error:", err);
    return response.error(res, err.message);
  }
};
