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

    return response.success(res, {
      overview: {
        verified_residents: parseInt(overviewRes.rows[0]?.verified_residents || '0'),
        total_tanods: parseInt(overviewRes.rows[0]?.total_tanods || '0'),
        active_alerts: parseInt(overviewRes.rows[0]?.active_alerts || '0')
      },
      alertsByType: byTypeRes.rows.map((r: any) => ({ ...r, count: parseInt(r.count || '0') })),
      alertsHistory: historyRes.rows.map((r: any) => ({ ...r, count: parseInt(r.count || '0') }))
    });

  } catch (err: any) {
    console.error("Analytics Dashboard Error:", err);
    return response.error(res, err.message);
  }
};
