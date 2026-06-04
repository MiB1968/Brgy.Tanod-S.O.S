// src/server/db/repositories/ReportRepository.ts
import { pool } from '../index';

export class ReportRepository {
  async getIncidentStats(startDate?: Date, endDate?: Date) {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_incidents,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN type = 'CRIME' THEN 1 END) as crime_count,
        COUNT(CASE WHEN type = 'MEDICAL' THEN 1 END) as medical_count
      FROM alerts
      WHERE created_at BETWEEN $1 AND $2
    `, [startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate || new Date()]);
    
    return result.rows[0];
  }

  async getResponseTimeAverage() {
    const result = await pool.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_response_time_seconds
      FROM alerts 
      WHERE status = 'resolved'
    `);
    return result.rows[0];
  }

  async getIncidentsByBarangay(barangayId: string, limit = 50) {
    const result = await pool.query(
      'SELECT id, client_uuid, resident_id, type, status, barangay_id, location, description, severity_score, urgency_level, responder_recommendations, ai_analysis, assigned_to, assigned_to_name, responded_by, responded_by_name, responded_at, resolution_notes, responder_notes, created_at, updated_at, resolved_at FROM alerts WHERE barangay_id = $1 ORDER BY created_at DESC LIMIT $2',
      [barangayId, limit]
    );
    return result.rows;
  }
}

export const reportRepository = new ReportRepository();
