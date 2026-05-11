import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/index';
import * as response from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { logAction } from '../services/auditService';

export const createUser = async (req: AuthRequest, res: Response) => {
  const { email, password, name, role, details } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return response.error(res, 'A user with that email already exists.', 'CONFLICT', 409);
    }

    const hashedPass = await bcrypt.hash(password, 12);

    const result = await client.query(
      `INSERT INTO users (email, password, name, role, status)
       VALUES ($1, $2, $3, $4, 'verified')
       RETURNING id, email, name, role, status`,
      [email, hashedPass, name, role]
    );
    const user = result.rows[0];

    if (role === 'tanod') {
      await client.query(
        `INSERT INTO patrols (tanod_id, tanod_name, is_active, status)
         VALUES ($1, $2, false, 'offline')`,
        [user.id, name]
      );
    }

    if (role === 'resident' && details) {
      await client.query(
        `INSERT INTO residents
           (id, name, phone, address, house_number, household_size,
            blood_type, medical_conditions,
            emergency_contact_name, emergency_contact_phone)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          user.id, name,
          details.phone, details.address, details.houseNumber,
          details.householdSize, details.bloodType,
          details.medicalConditions,
          details.emergencyContactName, details.emergencyContactPhone,
        ]
      );
    }

    await logAction(req.user!.id, 'ADMIN_CREATE_USER', 'users', user.id, {
      createdRole: role,
      createdEmail: email,
    });

    await client.query('COMMIT');
    return response.success(res, { user }, 'User created successfully.', 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Admin] createUser error:', err.message);
    return response.error(res, 'Failed to create user. Please try again.');
  } finally {
    client.release();
  }
};

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, role, status, created_at, last_active
       FROM users
       ORDER BY created_at DESC`
    );
    return response.success(res, result.rows);
  } catch (err: any) {
    console.error('[Admin] listUsers error:', err.message);
    return response.error(res, 'Failed to fetch users.');
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  const allowedRoles = ['resident', 'tanod', 'admin', 'superadmin'];
  if (!allowedRoles.includes(role)) {
    return response.error(res, 'Invalid role specified.', 'BAD_REQUEST', 400);
  }

  try {
    const result = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, email, name, role, status`,
      [role, id]
    );
    if (result.rows.length === 0) {
      return response.error(res, 'User not found.', 'NOT_FOUND', 404);
    }

    await logAction(req.user!.id, 'ADMIN_UPDATE_ROLE', 'users', id, {
      newRole: role,
    });

    return response.success(res, result.rows[0], 'User role updated.');
  } catch (err: any) {
    console.error('[Admin] updateUserRole error:', err.message);
    return response.error(res, 'Failed to update role.');
  }
};

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ['pending', 'verified', 'suspended'];
  if (!allowedStatuses.includes(status)) {
    return response.error(res, 'Invalid status specified.', 'BAD_REQUEST', 400);
  }

  try {
    const result = await pool.query(
      `UPDATE users SET status = $1 WHERE id = $2
       RETURNING id, email, name, role, status`,
      [status, id]
    );
    if (result.rows.length === 0) {
      return response.error(res, 'User not found.', 'NOT_FOUND', 404);
    }

    await logAction(req.user!.id, 'ADMIN_UPDATE_STATUS', 'users', id, {
      newStatus: status,
    });

    return response.success(res, result.rows[0], 'User status updated.');
  } catch (err: any) {
    console.error('[Admin] updateUserStatus error:', err.message);
    return response.error(res, 'Failed to update status.');
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (req.user!.id === id) {
    return response.error(res, 'You cannot delete your own account.', 'FORBIDDEN', 403);
  }

  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email, role',
      [id]
    );
    if (result.rows.length === 0) {
      return response.error(res, 'User not found.', 'NOT_FOUND', 404);
    }

    await logAction(req.user!.id, 'ADMIN_DELETE_USER', 'users', id, {
      deletedEmail: result.rows[0].email,
      deletedRole: result.rows[0].role,
    });

    return response.success(res, null, 'User deleted successfully.');
  } catch (err: any) {
    console.error('[Admin] deleteUser error:', err.message);
    return response.error(res, 'Failed to delete user.');
  }
};
