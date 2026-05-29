import { pool } from '../index';
import { AppError } from '../../middleware/error';

export abstract class BaseRepository<T extends { id: string }> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async getById(id: string): Promise<T | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM ${this.tableName} WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return null;
      return result.rows[0] as T;
    } catch (error) {
      console.error(`[Repository] GetById failed in ${this.tableName}`, error);
      throw new AppError('Failed to fetch record', 500, 'DB_READ_ERROR');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `DELETE FROM ${this.tableName} WHERE id = $1`,
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error(`[Repository] Delete failed in ${this.tableName}`, error);
      throw new AppError('Failed to delete record', 500, 'DB_DELETE_ERROR');
    }
  }
}
