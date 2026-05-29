import { pool } from '../index';
import { Incident } from '../../types';
import { AppError } from '../../middleware/error';

export class IncidentRepository {
  async create(data: any): Promise<Incident> {
    try {
      const location = JSON.stringify({ lat: data.latitude, lng: data.longitude });
      const aiAnalysisObj = data.aiAnalysis;
      const aiAnalysis = aiAnalysisObj ? JSON.stringify(aiAnalysisObj) : null;
      const severityScore = aiAnalysisObj?.severityScore || null;
      const urgencyLevel = aiAnalysisObj?.urgency || null;
      const responderRecommendations = aiAnalysisObj?.recommendedResponders ? JSON.stringify(aiAnalysisObj.recommendedResponders) : null;
      
      // Note: barangayId, photos, and voiceClip are handled or ignored depending on schema version.
      const result = await pool.query(
        `INSERT INTO alerts (
          resident_id, type, description, location, status, 
          ai_analysis, severity_score, urgency_level, responder_recommendations,
          assigned_to, assigned_to_name, barangay_id,
          created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now()) RETURNING *`,
        [
          data.reporterId, 
          data.type, 
          data.description || '', 
          location, 
          data.status ? data.status.toLowerCase() : 'pending', 
          aiAnalysis, 
          severityScore, 
          urgencyLevel, 
          responderRecommendations,
          data.assignedTo || null,
          data.assignedToName || null,
          data.barangayId || 'default'
        ]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        reporterId: row.resident_id,
        barangayId: row.barangay_id,
        type: row.type,
        status: row.status,
        description: row.description,
        location: row.location,
        latitude: row.location?.lat,
        longitude: row.location?.lng,
        aiAnalysis: row.ai_analysis,
        assignedTo: row.assigned_to,
        assignedToName: row.assigned_to_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } as Incident;
    } catch (err) {
      console.error("[IncidentRepository] Create error:", err);
      throw new AppError('Failed to create record', 500, 'DB_CREATE_ERROR');
    }
  }

  async getCountsByStatus(): Promise<{ pending: number, responding: number }> {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'responding') as responding
      FROM alerts;
    `);
    return {
      pending: parseInt(result.rows[0].pending, 10),
      responding: parseInt(result.rows[0].responding, 10)
    };
  }

  async findActiveByBarangay(barangayId: string, limit = 30): Promise<Incident[]> {
    const result = await pool.query(`
      SELECT * FROM alerts 
      WHERE (barangay_id = $1 OR barangay_id IS NULL)
      AND status IN ('pending', 'active', 'responding') 
      ORDER BY created_at DESC 
      LIMIT $2`, [barangayId, limit]
    );
    return result.rows.map(row => ({
      id: row.id,
      reporterId: row.resident_id,
      barangayId: row.barangay_id || 'default',
      type: row.type,
      status: row.status,
      description: row.description,
      location: row.location,
      latitude: row.location?.lat,
      longitude: row.location?.lng,
      aiAnalysis: row.ai_analysis,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } as Incident));
  }

  async findByReporter(reporterId: string, limit = 10): Promise<Incident[]> {
    const result = await pool.query(
      `SELECT * FROM alerts WHERE resident_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [reporterId, limit]
    );
    return result.rows.map(row => ({
      id: row.id,
      reporterId: row.resident_id,
      barangayId: row.barangay_id || 'default',
      type: row.type,
      status: row.status,
      description: row.description,
      location: row.location,
      latitude: row.location?.lat,
      longitude: row.location?.lng,
      aiAnalysis: row.ai_analysis,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } as Incident));
  }

  async findByStatus(status: string, barangayId?: string) {
    const query = barangayId 
      ? [`SELECT * FROM alerts WHERE status = $1 AND (barangay_id = $2 OR barangay_id IS NULL) ORDER BY created_at DESC`, [status, barangayId]]
      : [`SELECT * FROM alerts WHERE status = $1 ORDER BY created_at DESC`, [status]];
    
    const result = await pool.query(query[0] as string, query[1] as any[]);
    return result.rows.map(row => ({
      id: row.id,
      reporterId: row.resident_id,
      barangayId: row.barangay_id || 'default',
      type: row.type,
      status: row.status,
      description: row.description,
      location: row.location,
      latitude: row.location?.lat,
      longitude: row.location?.lng,
      aiAnalysis: row.ai_analysis,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } as Incident));
  }
}

