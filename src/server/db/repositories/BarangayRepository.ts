// src/server/db/repositories/BarangayRepository.ts
import { pool } from '../index';
import { AppError } from '../../middleware/error';

export class BarangayRepository {
  async getById(id: string) {
    try {
      const key = id.startsWith('barangay_') ? id : `barangay_${id}`;
      const result = await pool.query(
        'SELECT data FROM system_config WHERE key = $1',
        [key]
      );
      if (result.rows.length === 0) return null;
      return result.rows[0].data;
    } catch (error) {
      console.error('[BarangayRepository] Get failed', error);
      throw new AppError('Failed to fetch barangay config', 500);
    }
  }

  async getAll() {
    try {
      const result = await pool.query(
        "SELECT key, data FROM system_config WHERE key LIKE 'barangay_%'"
      );
      return result.rows.map(r => ({
        id: r.key.replace('barangay_', ''),
        ...r.data
      }));
    } catch (error) {
      console.error('[BarangayRepository] GetAll failed', error);
      throw new AppError('Failed to fetch barangays', 500);
    }
  }
}

export const barangayRepository = new BarangayRepository();
