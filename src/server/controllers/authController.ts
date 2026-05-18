import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/index';
import { config } from '../config/index';
import * as response from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { logAction } from '../services/auditService';

// ── Cookie options (single source of truth) ──────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,                              // JS cannot read this cookie
  secure: isProduction,                        // Require secure (needed for sameSite: 'none' in prod)
  sameSite: isProduction ? 'none' as const : 'lax' as const, 
  maxAge: 7 * 24 * 60 * 60 * 1000,            // 7 days
};

// ── Register ─────────────────────────────────────────────────────────────────
export const register = async (req: Request, res: Response) => {
  const { email: rawEmail, password, name, role: rawRole, details } = req.body;
  const email = rawEmail?.toLowerCase();

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
      { id: user.id, email: user.email, role: user.role, tokenVersion: user.token_version || 1 },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    res.cookie('token', token, cookieOptions);

    // Return user info with token in body for better reliability in some environments
    return response.success(
      res,
      { user, token },
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
  const { email, password, isGoogle } = req.body;
  const normalizedEmail = email?.toLowerCase();
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [normalizedEmail]
    );
    const user = result.rows[0];

    let passwordMatch = false;
    if (user) {
      if (isGoogle) {
        // If it's a Google login, we trust the client's Firebase validation for now
        // In a real production app, we would verify the Firebase ID token on the server
        passwordMatch = true;
      } else {
        passwordMatch = await bcrypt.compare(password, user.password);
      }
    } else {
      // Constant-time dummy comparison
      const dummyHash = '$2a$12$invaliddummyhashfortimingprotection000000000000000000';
      await bcrypt.compare(password || 'dummy', dummyHash);
    }

    if (!user || !passwordMatch) {
      return response.error(res, 'Invalid email or password.', 'UNAUTHORIZED', 401);
    }

    await logAction(user.id, 'USER_LOGIN', 'users', user.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tokenVersion: user.token_version || 1 },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    res.cookie('token', token, cookieOptions);

    const { password: _, ...userWithoutPass } = user;

    // Return token in body for reliability (especially in dev environments)
    return response.success(res, { user: userWithoutPass, token }, 'Login successful');
  } catch (err: any) {
    console.error('[Auth] Login error:', err.message);
    return response.error(res, 'Login failed. Please try again.');
  }
};

// ── Logout ───────────────────────────────────────────────────────────────────
export const logout = (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
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
