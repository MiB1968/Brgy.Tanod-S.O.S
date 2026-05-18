import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../db/index';
import * as response from '../utils/response';

export const getDashboardAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'superadmin' && userRole !== 'tanod') {
      return response.error(res, "Administrative clearance required", "FORBIDDEN", 403);
    }

    // 1. Overview metrics
    const overviewPromise = pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'resident' AND status = 'approved') as verified_residents,
        (SELECT COUNT(*) FROM users WHERE role = 'tanod') as total_tanods,
        (SELECT COUNT(*) FROM alerts WHERE status IN ('pending', 'active', 'responding')) as active_alerts
    `).catch(err => {
      console.error("Analytics Overview Query Error:", err);
      return { rows: [{ verified_residents: 0, total_tanods: 0, active_alerts: 0 }] };
    });

    // 2. Alerts by type
    const byTypePromise = pool.query(`
      SELECT type, COUNT(*) as count 
      FROM alerts 
      GROUP BY type 
      ORDER BY count DESC
    `).catch(err => {
      console.error("Analytics ByType Query Error:", err);
      return { rows: [] };
    });

    // 3. Alerts history (last 7 days)
    const historyPromise = pool.query(`
      SELECT 
        DATE(created_at) as day, 
        COUNT(*) as count 
      FROM alerts 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY day 
      ORDER BY day ASC
    `).catch(err => {
      console.error("Analytics History Query Error:", err);
      return { rows: [] };
    });

    const [overviewRes, byTypeRes, historyRes] = await Promise.all([
      overviewPromise,
      byTypePromise,
      historyPromise
    ]);

    const overview = (overviewRes && overviewRes.rows && overviewRes.rows[0]) ? overviewRes.rows[0] : { verified_residents: '0', total_tanods: '0', active_alerts: '0' };
    const alertsByTypeRows = (byTypeRes && byTypeRes.rows) ? byTypeRes.rows : [];
    const alertsHistoryRows = (historyRes && historyRes.rows) ? historyRes.rows : [];

    console.log(`[Analytics] Serving dashboard data. Alerts: ${alertsByTypeRows.length}, History: ${alertsHistoryRows.length}`);

    return response.success(res, {
      overview: {
        verified_residents: parseInt(overview.verified_residents || '0'),
        total_tanods: parseInt(overview.total_tanods || '0'),
        active_alerts: parseInt(overview.active_alerts || '0')
      },
      alertsByType: alertsByTypeRows.map((r: any) => ({ ...r, count: parseInt(r.count || '0') })),
      alertsHistory: alertsHistoryRows.map((r: any) => ({ ...r, count: parseInt(r.count || '0') }))
    });

  } catch (err: any) {
    console.error("Analytics Dashboard Error:", err);
    return response.error(res, "Failed to compile tactical analytics. Data link unstable.", "SERVER_ERROR", 500);
  }
};

export const getHeatmapData = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        type, 
        location->>'lat' as lat, 
        location->>'lng' as lng, 
        created_at as timestamp 
      FROM alerts 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `).catch(err => {
      console.error("Heatmap Query Error:", err);
      return { rows: [] };
    });

    const heatmap = (result.rows || []).map(r => ({
      id: r.id,
      type: r.type,
      lat: parseFloat(r.lat || '14.5995'),
      lng: parseFloat(r.lng || '120.9842'),
      timestamp: r.timestamp
    }));

    return res.json(heatmap);
  } catch (err: any) {
    console.error("Heatmap Analytics Error:", err);
    return response.error(res, err.message);
  }
};
