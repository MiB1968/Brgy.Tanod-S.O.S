import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getDb } from '../db/index';
import * as response from '../utils/response';

export const getDashboardAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'superadmin' && userRole !== 'tanod') {
      return response.error(res, "Administrative clearance required", "FORBIDDEN", 403);
    }

    const db = getDb();
    
    let verified_residents = 0;
    let total_tanods = 0;
    let active_alerts = 0;
    const alertsByTypeMap: Record<string, number> = {};
    const alertsHistoryMap: Record<string, number> = {};

    try {
      // 1. Users overview
      const usersSnap = await db.collection('users').get();
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.role === 'resident' && data.status === 'approved') verified_residents++;
        if (data.role === 'tanod') total_tanods++;
      });
      
      // 2. Alerts overview, types and history
      const alertsSnap = await db.collection('alerts').get();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      alertsSnap.forEach(doc => {
        const data = doc.data();
        
        // Active alerts
        if (['pending', 'active', 'responding'].includes(data.status)) {
          active_alerts++;
        }
        
        // Alert types
        if (data.type) {
          alertsByTypeMap[data.type] = (alertsByTypeMap[data.type] || 0) + 1;
        }
        
        // History (last 7 days by date)
        let ts = 0;
        if (data.created_at) {
          // Could be ISO string or timestamp number
          ts = typeof data.created_at === 'string' ? new Date(data.created_at).getTime() : data.created_at;
        } else if (data.timestamp) {
          ts = typeof data.timestamp === 'string' ? new Date(data.timestamp).getTime() : data.timestamp;
        }
        
        if (ts && ts >= sevenDaysAgo) {
          const dateStr = new Date(ts).toISOString().split('T')[0];
          alertsHistoryMap[dateStr] = (alertsHistoryMap[dateStr] || 0) + 1;
        }
      });
      
    } catch (dbErr) {
      console.error("Firestore Analytics Fetch Error:", dbErr);
    }

    const alertsByTypeRows = Object.keys(alertsByTypeMap).map(type => ({
      type,
      count: alertsByTypeMap[type]
    })).sort((a, b) => b.count - a.count);
    
    const alertsHistoryRows = Object.keys(alertsHistoryMap).map(day => ({
      day,
      count: alertsHistoryMap[day]
    })).sort((a, b) => a.day.localeCompare(b.day));

    console.log(`[Analytics] Serving dashboard data. Alerts: ${alertsByTypeRows.length}, History: ${alertsHistoryRows.length}`);

    return response.success(res, {
      overview: { verified_residents, total_tanods, active_alerts },
      alertsByType: alertsByTypeRows,
      alertsHistory: alertsHistoryRows
    });

  } catch (err: any) {
    console.error("Analytics Dashboard Error:", err);
    return response.error(res, "Failed to compile tactical analytics. Data link unstable.", "SERVER_ERROR", 500);
  }
};

export const getHeatmapData = async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const heatmap: any[] = [];
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    try {
      const alertsSnap = await db.collection('alerts').get();
      alertsSnap.forEach(doc => {
        const data = doc.data();
        let ts = 0;
        if (data.created_at) ts = typeof data.created_at === 'string' ? new Date(data.created_at).getTime() : data.created_at;
        else if (data.timestamp) ts = typeof data.timestamp === 'string' ? new Date(data.timestamp).getTime() : data.timestamp;
        
        if (ts && Math.abs(ts - Date.now()) < 5 * 365 * 24 * 60 * 60 * 1000) { // arbitrary validation
          if (ts >= thirtyDaysAgo) {
            let lat, lng;
            if (data.location?.lat) { lat = data.location.lat; lng = data.location.lng; }
            else if (data.lat) { lat = data.lat; lng = data.lng; }
            else if (data.latitude) { lat = data.latitude; lng = data.longitude; }
            
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              heatmap.push({
                id: doc.id,
                type: data.type || 'UNKNOWN',
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                timestamp: ts
              });
            }
          }
        }
      });
    } catch (e) {
      console.error("Heatmap query error:", e);
    }

    return res.json(heatmap);
  } catch (err: any) {
    console.error("Heatmap Analytics Error:", err);
    return response.error(res, err.message);
  }
};
