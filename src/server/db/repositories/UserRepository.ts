// src/server/repositories/UserRepository.ts
import { pool } from '../index';
import { AppError } from '../../middleware/error';
import { logger } from '../../utils/logger';
import { z } from 'zod';

const UserStatusSchema = z.enum(['pending', 'verified', 'active', 'suspended', 'inactive']);
const UserRoleSchema = z.enum(['resident', 'tanod', 'admin', 'superadmin', 'captain']);

export class UserRepository {
  async findById(id: string) {
    const result = await pool.query(
      'SELECT id, email, name, role, status, created_at, last_active FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async findByEmail(email: string) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async create(userData: {
    email: string;
    password: string;
    name: string;
    role?: string;
    status?: string;
  }) {
    const { email, password, name, role = 'resident', status = 'pending' } = userData;

    const result = await pool.query(
      `INSERT INTO users (email, password, name, role, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, status, created_at`,
      [email, password, name, role, status]
    );

    logger.info(`New user created: ${email} (${role})`);
    return result.rows[0];
  }

  async updateLastActive(id: string) {
    await pool.query(
      'UPDATE users SET last_active = now() WHERE id = $1',
      [id]
    );
  }

  async findAllByRole(role: string, limit = 50) {
    const result = await pool.query(
      'SELECT id, name, email, role, status FROM users WHERE role = $1 LIMIT $2',
      [role, limit]
    );
    return result.rows;
  }

  async updateStatus(id: string, status: string) {
    try {
      UserStatusSchema.parse(status);
    } catch (err) {
      throw new AppError(`Invalid status. Must be one of: ${UserStatusSchema.options.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    const result = await pool.query(
      'UPDATE users SET status = $1, last_active = now() WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0];
  }

  async updateRole(id: string, role: string) {
    try {
      UserRoleSchema.parse(role);
    } catch (err) {
      throw new AppError(`Invalid role. Must be one of: ${UserRoleSchema.options.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, last_active = now() WHERE id = $2 RETURNING *',
      [role, id]
    );
    return result.rows[0];
  }
}

export const userRepository = new UserRepository();
