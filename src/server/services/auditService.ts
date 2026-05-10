import { pool } from '../db/index';
import { logger } from '../utils/logger';

export async function logAction(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: any = {}
) {
  try {
    await pool.query(
      "INSERT INTO audit_logs (citizen_id, type, notes, created_at) VALUES ($1, $2, $3, now())",
      [userId, action, JSON.stringify({ entityType, entityId, ...metadata })]
    );
    logger.debug(`Audit log: ${action} on ${entityType}:${entityId} by user:${userId}`);
  } catch (err: any) {
    logger.error(`Failed to create audit log: ${err.message}`);
  }
}
