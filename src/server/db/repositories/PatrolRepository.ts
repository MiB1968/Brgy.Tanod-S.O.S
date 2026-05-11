// src/server/db/repositories/PatrolRepository.ts
import { pool } from '../index';
import { logger } from '../../utils/logger';

export interface Patrol {
  id?: string;
  tanod_id: string;
  tanod_name?: string;
  is_active: boolean;
  location?: any;
  last_ping?: Date;
  assigned_incident_id?: string | null;
  status?: string;
}

export class PatrolRepository {
  async findByTanodId(tanodId: string) {
    const result = await pool.query(
      'SELECT * FROM patrols WHERE tanod_id = $1',
      [tanodId]
    );
    return result.rows[0];
  }

  async getAllActive() {
    const result = await pool.query(`
      SELECT p.*, u.name as tanod_name, u.role 
      FROM patrols p
      JOIN users u ON p.tanod_id = u.id
      WHERE p.is_active = true 
        AND p.last_ping > NOW() - INTERVAL '30 minutes'
      ORDER BY p.last_ping DESC
    `);
    return result.rows;
  }

  async updatePatrol(data: Patrol) {
    const result = await pool.query(
      `INSERT INTO patrols (tanod_id, tanod_name, is_active, location, last_ping, assigned_incident_id, status)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6)
       ON CONFLICT (tanod_id) DO UPDATE 
       SET location = $4, 
           last_ping = NOW(),
           is_active = $3,
           assigned_incident_id = $5,
           status = $6
       RETURNING *`,
      [
        data.tanod_id,
        data.tanod_name,
        data.is_active,
        data.location ? JSON.stringify(data.location) : null,
        data.assigned_incident_id,
        data.status || 'available'
      ]
    );
    return result.rows[0];
  }

  async assignToIncident(tanodId: string, incidentId: string) {
    const result = await pool.query(
      `UPDATE patrols 
       SET assigned_incident_id = $1, status = 'on-duty' 
       WHERE tanod_id = $2 RETURNING *`,
      [incidentId, tanodId]
    );
    return result.rows[0];
  }

  async markAvailable(tanodId: string) {
    await pool.query(
      `UPDATE patrols 
       SET assigned_incident_id = NULL, status = 'available' 
       WHERE tanod_id = $1`,
      [tanodId]
    );
  }
}

export const patrolRepository = new PatrolRepository();
