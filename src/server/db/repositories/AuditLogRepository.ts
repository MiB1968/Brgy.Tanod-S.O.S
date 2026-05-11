// src/server/repositories/AuditLogRepository.ts
import { pool } from '../index';
import { logger } from '../../utils/logger';

export class AuditLogRepository {
  async create(log: {
    incident_id?: string;
    type: string;
    status?: string;
    citizen_id?: string;
    tanod_assigned?: string;
    location_lat?: number;
    location_lng?: number;
    notes?: string;
  }) {
    const result = await pool.query(
      `INSERT INTO audit_logs (
        incident_id, type, status, citizen_id, 
        tanod_assigned, location_lat, location_lng, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        log.incident_id,
        log.type,
        log.status,
        log.citizen_id,
        log.tanod_assigned,
        log.location_lat,
        log.location_lng,
        log.notes
      ]
    );

    logger.info(`Audit log created: ${log.type}`);
    return result.rows[0];
  }

  async getByIncident(incidentId: string) {
    const result = await pool.query(
      'SELECT * FROM audit_logs WHERE incident_id = $1 ORDER BY created_at DESC',
      [incidentId]
    );
    return result.rows;
  }

  async getRecentLogs(limit = 100) {
    const result = await pool.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }
}

export const auditLogRepository = new AuditLogRepository();
