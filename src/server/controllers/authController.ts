import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/index';
import { config } from '../config/index';
import * as response from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { logAction } from '../services/auditService';

// ── Cookie options (single source of truth) ──────────────────────────────────
const cookieOptions = {
  httpOnly: true,                              // JS cannot read this cookie
  secure: true,                                // Require secure (needed for sameSite: 'none')
  sameSite: 'none' as const,                   // Must be 'none' for cross-origin iframes
  maxAge: 7 * 24 * 60 * 60 * 1000,            // 7 days
};

// ── Register ─────────────────────────────────────────────────────────────────
export const register = async (req: Request, res: Response) => {
  const { email, password, name, role: rawRole, details } = req.body;

  // SECURITY: Enforce allowed roles server-side regardless of what was sent.
  // Validator already blocks admin/superadmin, but we double-check here.
  const allowedPublicRoles = ['resident', 'tanod'];
  const role = allowedPublicRoles.includes(rawRole) ? rawRole : 'resident';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (userResult.rows.length > 0) {
      // Generic message — don't confirm whether an email exists
      await client.query('ROLLBACK');
      return response.error(res, 'Registration failed. Please check your details.', 'CONFLICT', 409);
    }

    // Cost factor 12 — stronger than 10, still fast enough
    const hashedPass = await bcrypt.hash(password, 12);

    const result = await client.query(
      `INSERT INTO users (email, password, name, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, status`,
      [email, hashedPass, name, role, 'pending'] // ALL self-registrations start as 'pending'
    );
    const user = result.rows[0];

    if (role === 'resident' && details) {
      await client.query(
        `INSERT INTO residents
           (id, name, phone, address, house_number, household_size,
            blood_type, medical_conditions,
            emergency_contact_name, emergency_contact_phone,
            gps_lat, gps_lng)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          user.id, name,
          details.phone, details.address, details.houseNumber,
          details.householdSize, details.bloodType,
          details.medicalConditions,
          details.emergencyContactName, details.emergencyContactPhone,
          details.gpsLat, details.gpsLng,
        ]
      );
    } else if (role === 'tanod') {
      await client.query(
        `INSERT INTO patrols (tanod_id, tanod_name, is_active, status)
         VALUES ($1, $2, false, 'offline')`,
        [user.id, name]
      );
    }

    await logAction(user.id, 'USER_REGISTERED', 'users', user.id, { role: user.role });
    await client.query('COMMIT');

    // Issue JWT as httpOnly cookie ONLY — not in the response body
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    res.cookie('token', token, cookieOptions);

    // Return user info without password — no token in body
    return response.success(
      res,
      { user },
      'Registration successful. Awaiting admin approval.',
      201
    );
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Auth] Register error:', err.message);
    return response.error(res, 'Registration failed. Please try again.');
  } finally {
    client.release();
  }
};

// ── Login ────────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];

    // Constant-time comparison even when user doesn't exist
    // (avoids timing attacks that reveal whether an email is registered)
    const dummyHash = '$2a$12$invaliddummyhashfortimingprotection000000000000000000';
    const passwordMatch = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user || !passwordMatch) {
      return response.error(res, 'Invalid email or password.', 'UNAUTHORIZED', 401);
    }

    await logAction(user.id, 'USER_LOGIN', 'users', user.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    res.cookie('token', token, cookieOptions);

    const { password: _, ...userWithoutPass } = user;

    // No token in body — cookie is the auth mechanism
    return response.success(res, { user: userWithoutPass }, 'Login successful');
  } catch (err: any) {
    console.error('[Auth] Login error:', err.message);
    return response.error(res, 'Login failed. Please try again.');
  }
};

// ── Logout ───────────────────────────────────────────────────────────────────
export const logout = (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  return response.success(res, null, 'Logged out successfully');
};

// ── Me (current user) ────────────────────────────────────────────────────────
// NOTE: This handler now relies on the authenticate middleware being applied
// in authRoutes.ts. req.user is already verified — no manual re-verification.
export const me = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, status, last_active FROM users WHERE id = $1',
      [req.user!.id]
    );
    const user = result.rows[0];
    if (!user) return response.error(res, 'User not found', 'NOT_FOUND', 404);
    return response.success(res, user);
  } catch (err: any) {
    console.error('[Auth] Me error:', err.message);
    return response.error(res, 'Could not retrieve user.', 'SERVER_ERROR', 500);
  }
};
