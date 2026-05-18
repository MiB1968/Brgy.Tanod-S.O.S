import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, admin } from '../db/index';
import { config } from '../config/index';
import * as response from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { logAction } from '../services/auditService';

// ── Cookie options (single source of truth) ──────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' as const : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,   // 7 days
};

// ── Register ──────────────────────────────────────────────────────────────────
export const register = async (req: Request, res: Response) => {
  const { email: rawEmail, password, name, role: rawRole, details } = req.body;
  const email = rawEmail?.toLowerCase();

  // SECURITY: Enforce allowed roles server-side regardless of what was sent.
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
      await client.query('ROLLBACK');
      return response.error(res, 'Registration failed. Please check your details.', 'CONFLICT', 409);
    }

    const hashedPass = await bcrypt.hash(password, 12);

    const result = await client.query(
      `INSERT INTO users (email, password, name, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, status`,
      [email, hashedPass, name, role, 'pending']
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

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tokenVersion: user.token_version || 1 },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    res.cookie('token', token, cookieOptions);

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

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  const { email, password, isGoogle, firebaseIdToken } = req.body;
  const normalizedEmail = email?.toLowerCase();

  try {
    // ── SECURITY: Verify Google logins server-side ────────────────────────────
    // NEVER trust isGoogle: true from the client without verifying the token.
    if (isGoogle) {
      if (!firebaseIdToken) {
        return response.error(
          res,
          'Google login requires a valid Firebase ID token.',
          'UNAUTHORIZED',
          401
        );
      }

      let decodedToken: admin.auth.DecodedIdToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
      } catch (err: any) {
        console.warn('[Auth] Firebase ID token verification failed:', err.message);
        return response.error(
          res,
          'Google authentication failed. Invalid or expired token.',
          'UNAUTHORIZED',
          401
        );
      }

      // Token email must match the email the client claims
      if (decodedToken.email?.toLowerCase() !== normalizedEmail) {
        return response.error(
          res,
          'Google token email does not match the provided email.',
          'UNAUTHORIZED',
          401
        );
      }

      // Look up the user in our DB by verified email
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [normalizedEmail]
      );
      const user = result.rows[0];

      if (!user) {
        // User authenticated with Google but not registered in our system yet
        return response.error(
          res,
          'No account found for this Google email. Please register first.',
          'NOT_FOUND',
          404
        );
      }

      await logAction(user.id, 'USER_LOGIN_GOOGLE', 'users', user.id);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tokenVersion: user.token_version || 1 },
        config.jwtSecret,
        { expiresIn: '7d' }
      );
      res.cookie('token', token, cookieOptions);

      const { password: _, ...userWithoutPass } = user;
      return response.success(res, { user: userWithoutPass, token }, 'Google login successful');
    }

    // ── Standard email/password login ─────────────────────────────────────────
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [normalizedEmail]
    );
    const user = result.rows[0];

    let passwordMatch = false;
    if (user) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // Constant-time dummy comparison to prevent timing attacks
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
    return response.success(res, { user: userWithoutPass, token }, 'Login successful');

  } catch (err: any) {
    console.error('[Auth] Login error:', err.message);
    return response.error(res, 'Login failed. Please try again.');
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
export const logout = (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  return response.success(res, null, 'Logged out successfully');
};

// ── Me (current user) ─────────────────────────────────────────────────────────
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
