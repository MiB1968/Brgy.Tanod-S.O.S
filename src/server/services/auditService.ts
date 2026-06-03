import { pool } from '../db/index';
import { logger } from '../utils/logger';

/**
 * Structured Audit Logging
 *
 * Tracks:
 * - actorId: Who performed the action
 * - action: What was done (e.g., login, SOS_CREATION)
 * - entityType: What kind of object was affected
 * - entityId: The specific object ID
 * - metadata: Additional JSON details
 */

export async function logAction(
  actorId: string | null,
  action: string,
  entityType: string | null = null,
  entityId: string | null = null,
  metadata: any = {}
) {
  try {
    // We populate both new structured fields and legacy fields for compatibility
    await pool.query(
      `INSERT INTO audit_logs (
        actor_id, action, entity_type, entity_id, metadata,
        citizen_id, type, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [
        actorId,
        action,
        entityType,
        entityId,
        JSON.stringify(metadata),
        actorId, // legacy citizen_id
        action,  // legacy type
        JSON.stringify({ entityType, entityId, ...metadata }) // legacy notes
      ]
    );
    logger.debug(`[AUDIT] ${action} | actor:${actorId} | entity:${entityType}:${entityId}`);
  } catch (err: any) {
    logger.error(`[AUDIT] Failed to create audit log: ${err.message}`);
  }
}

interface LogAdminActionParams {
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
}: LogAdminActionParams) {
  try {
    // Populate new structured fields, legacy adminId, and legacy target fields
    await pool.query(
      `INSERT INTO audit_logs (
        actor_id, action, entity_type, entity_id, metadata,
        admin_id, target_table, target_id, details, created_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        adminId,
        action,
        targetTable,
        targetId,
        JSON.stringify(details),
        adminId,
        targetTable || null,
        targetId || null,
        JSON.stringify(details)
      ]
    );
    logger.debug(`[AUDIT] Admin Action: ${action} | admin:${adminId} | target:${targetTable}:${targetId}`);
  } catch (err: any) {
    logger.error(`[AUDIT] Failed to log admin action: ${err.message}`);
  }
}
