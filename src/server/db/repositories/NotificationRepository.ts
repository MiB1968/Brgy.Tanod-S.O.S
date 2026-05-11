// src/server/db/repositories/NotificationRepository.ts
import { pool } from '../index';
import { logger } from '../../utils/logger';

export class NotificationRepository {
  async create(notification: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    incident_id?: string;
    read?: boolean;
  }) {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, incident_id, read)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        notification.user_id,
        notification.type,
        notification.title,
        notification.message,
        notification.incident_id,
        notification.read || false
      ]
    );
    logger.info(`Notification sent to user ${notification.user_id}`);
    return result.rows[0];
  }

  async getByUserId(userId: string, limit = 20) {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  async markAsRead(notificationId: string) {
    await pool.query(
      'UPDATE notifications SET read = true WHERE id = $1',
      [notificationId]
    );
  }

  async markAllAsRead(userId: string) {
    await pool.query(
      'UPDATE notifications SET read = true WHERE user_id = $1',
      [userId]
    );
  }
}

export const notificationRepository = new NotificationRepository();
