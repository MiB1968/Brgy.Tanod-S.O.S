// src/server/repositories/TanodLocationRepository.ts
import { pool } from '../index';
import { logger } from '../../utils/logger';

export interface TanodLocation {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  timestamp: number;
  role: string;
}

export class TanodLocationRepository {
  async updateLocation(data: TanodLocation) {
    // Update or insert into patrols table
    const result = await pool.query(
      `INSERT INTO patrols (tanod_id, tanod_name, is_active, location, last_ping)
       VALUES ($1, $2, true, $3, now())
       ON CONFLICT (tanod_id) 
       DO UPDATE SET 
         location = $3,
         is_active = true,
         last_ping = now()
       RETURNING tanod_id, tanod_name, is_active, location, last_ping`,
      [
        data.userId,
        data.role, // temporary, better to join with users later
        JSON.stringify({ lat: data.latitude, lng: data.longitude, accuracy: data.accuracy })
      ]
    );

    logger.debug(`Tanod location updated: ${data.userId}`);
    return result.rows[0];
  }

  async getActiveTanods() {
    const result = await pool.query(`
      SELECT p.*, u.name as tanod_name 
      FROM patrols p 
      JOIN users u ON p.tanod_id = u.id 
      WHERE p.is_active = true 
        AND p.last_ping > now() - INTERVAL '15 minutes'
    `);
    return result.rows;
  }

  async deactivateLocation(userId: string) {
    await pool.query(
      'UPDATE patrols SET is_active = false WHERE tanod_id = $1',
      [userId]
    );
  }
}

export const tanodLocationRepository = new TanodLocationRepository();
