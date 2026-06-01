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

interface LogActionParams {
  adminId: string | null;
  action: string;
  targetTable?: string;
  targetId?: string;
  details?: Record<string, any>;
}

export async function logAdminAction({
  adminId,
  action,
  targetTable,
  targetId,
  details = {},
}: LogActionParams) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (admin_id, action, target_table, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [adminId, action, targetTable || null, targetId || null, JSON.stringify(details)]
    );
    logger.debug(`Admin Audit log: ${action} on ${targetTable}:${targetId} by admin:${adminId}`);
  } catch (err: any) {
    logger.error(`Failed to log admin action: ${err.message}`);
  }
}
