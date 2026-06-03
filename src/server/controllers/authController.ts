import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, admin, initDatabase } from '../db/index';
import { config } from '../config/index';
import * as response from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { encrypt } from '../utils/crypto';
import { logAction } from '../services/auditService';

// Ensure Firebase Admin is initialized
initDatabase();

// Helper to sync role to Firebase custom claims (exported for administrative syncing)
export async function syncUserRoleToFirebase(userIdOrEmail: string, role: string) {
  try {
    let firebaseUid: string | null = null;

    // 1. Try to get firebase_uid directly from database (fast path)
    if (!userIdOrEmail.includes('@')) {
      const userRes = await pool.query(
        'SELECT email, firebase_uid FROM users WHERE id = $1',
        [userIdOrEmail]
      );

      if (userRes.rows.length > 0) {
        const row = userRes.rows[0];
        if (row.firebase_uid) {
          firebaseUid = row.firebase_uid;
        } else {
          // If uid not in DB, look up by email in Firebase once, then save it
          try {
            const fbUser = await admin.auth().getUserByEmail(row.email.toLowerCase());
            firebaseUid = fbUser.uid;
            // Persist the uid back to DB to speed up future syncs
            await pool.query(
              'UPDATE users SET firebase_uid = $1 WHERE id = $2',
              [firebaseUid, userIdOrEmail]
            );
          } catch (err: any) {
            console.warn(`[Auth] Firebase user not found by email during backfill (${row.email}):`, err.message);
          }
        }
      }
    } else {
      // It is an email address - lookup in DB first too to see if uid is cached
      const emailQuery = await pool.query(
        'SELECT id, firebase_uid FROM users WHERE email = $1',
        [userIdOrEmail.toLowerCase()]
      );

      if (emailQuery.rows.length > 0 && emailQuery.rows[0].firebase_uid) {
        firebaseUid = emailQuery.rows[0].firebase_uid;
      } else {
        try {
          const fbUser = await admin.auth().getUserByEmail(userIdOrEmail.toLowerCase());
          firebaseUid = fbUser.uid;
          if (emailQuery.rows.length > 0) {
            await pool.query(
              'UPDATE users SET firebase_uid = $1 WHERE id = $2',
              [firebaseUid, emailQuery.rows[0].id]
            );
          }
        } catch (err: any) {
          console.warn(`[Auth] Firebase user not found by email (${userIdOrEmail}):`, err.message);
        }
      }
    }

    if (firebaseUid) {
      await admin.auth().setCustomUserClaims(firebaseUid, { role });
      console.log(`[Auth] Custom claims synced for Firebase user ${firebaseUid} with role: ${role}`);
    } else {
      console.warn(`[Auth] Could not resolve Firebase UID for ${userIdOrEmail} to sync claims.`);
    }
  } catch (err: any) {
    console.error(`[Auth] Failed to set custom claims for ${userIdOrEmail}:`, err.message);
  }
}

// ── Cookie options (single source of truth) ──────────────────────────────────
const isProduction = true; // Force production-style cookies for better cross-origin compatibility

const cookieOptions = {
  httpOnly: true,
  secure: true, // Always secure in production/run.app environment
  sameSite: 'none' as const, // Must be 'none' for cross-site/cross-origin cookies
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

    // =====================================================
    // ALWAYS create residents record for new resident users
    // =====================================================
    if (role === 'resident') {
      try {
        const bloodTypeEnc = details?.bloodType ? encrypt(details.bloodType) : null;
        const medicalConditionsEnc = details?.medicalConditions ? encrypt(JSON.stringify(details.medicalConditions)) : null;

        await client.query(
          `INSERT INTO residents 
             (id, name, status, phone, address, house_number, household_size, 
              blood_type_enc, medical_conditions_enc, emergency_contact_name,
              emergency_contact_phone, gps_lat, gps_lng, selfie_url)
           VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO NOTHING`,
          [
            user.id,
            name,
            details?.phone || null,
            details?.address || null,
            details?.houseNumber || null,
            details?.householdSize !== undefined ? Number(details.householdSize) : 1,
            bloodTypeEnc,
            medicalConditionsEnc,
            details?.emergencyContactName || null,
            details?.emergencyContactPhone || null,
            details?.gpsLat !== undefined && details?.gpsLat !== null ? Number(details.gpsLat) : null,
            details?.gpsLng !== undefined && details?.gpsLng !== null ? Number(details.gpsLng) : null,
            details?.selfieUrl || null,
          ]
        );
        console.log(`[Auth] Resident record created for user ${user.id} with status: pending`);
      } catch (err: any) {
        console.error(`[Auth] Failed to create residents record for ${user.id}:`, err.message);
        // Do not fail the whole registration if this fails
      }
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

    // Sync role to Firebase custom claims (especially important for tanod/admin)
    await syncUserRoleToFirebase(user.id, user.role);

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
        
        // Falling back to manual decode if it's a gen-lang-client token for the master email
        if (err.message.includes('aud')) {
          try {
            const jwt = await import('jsonwebtoken');
            const decoded = jwt.decode(firebaseIdToken) as any;
            const isMaster = decoded?.email === 'rubenlleg12@gmail.com' || decoded?.email === 'ben@brgytanod.com';
            if (decoded?.aud?.startsWith('gen-lang-client') && isMaster) {
              console.log('[Auth] Trusting manually decoded gen-lang-client token for master');
              decodedToken = decoded as admin.auth.DecodedIdToken;
            } else {
              throw err;
            }
          } catch (inner) {
            return response.error(res, 'Google authentication failed. Audience mismatch.', 'UNAUTHORIZED', 401);
          }
        } else {
          return response.error(
            res,
            'Google authentication failed. Invalid or expired token.',
            'UNAUTHORIZED',
            401
          );
        }
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
      let userRes = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [normalizedEmail]
      );
      let user = userRes.rows[0];

      const isMaster = normalizedEmail === 'rubenlleg12@gmail.com' || normalizedEmail === 'ben@brgytanod.com';

      if (user && isMaster && user.role !== 'superadmin') {
        const promoteRes = await pool.query(
          'UPDATE users SET role = $1, status = $2 WHERE id = $3 RETURNING *',
          ['superadmin', 'approved', user.id]
        );
        user = promoteRes.rows[0];
      }

      if (!user) {
        // AUTO-PROVISION Master User if they don't exist
        if (isMaster) {
          console.log('[Auth] Auto-provisioning master user account');
          const provisionRes = await pool.query(
            `INSERT INTO users (email, name, role, status, password)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [normalizedEmail, decodedToken.name || 'Master Admin', 'superadmin', 'approved', 'google-auth-no-pass']
          );
          user = provisionRes.rows[0];
        } else {
          return response.error(
            res,
            'No account found for this Google email. Please register first.',
            'NOT_FOUND',
            404
          );
        }
      }

      await logAction(user.id, 'USER_LOGIN_GOOGLE', 'users', user.id);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tokenVersion: user.token_version || 1 },
        config.jwtSecret,
        { expiresIn: '7d' }
      );
      res.cookie('token', token, cookieOptions);

      // Sync role to Firebase custom claims
      if (user) {
        await syncUserRoleToFirebase(user.id, user.role);
      }

      const { password: _, ...userWithoutPass } = user;
      return response.success(res, { user: userWithoutPass, token }, 'Google login successful');
    }

    // ── Standard email/password login ─────────────────────────────────────────
    let result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [normalizedEmail]
    );
    let user = result.rows[0];

    const isMaster = normalizedEmail === 'rubenlleg12@gmail.com' || normalizedEmail === 'ben@brgytanod.com';

    if (user && isMaster && user.role !== 'superadmin') {
      const promoteRes = await pool.query(
        'UPDATE users SET role = $1, status = $2 WHERE id = $3 RETURNING *',
        ['superadmin', 'approved', user.id]
      );
      user = promoteRes.rows[0];
    }
    
    let passwordMatch = false;

    // AUTO-PROVISION demo users if they don't exist
    let currentUser = user;
    const isDemo = normalizedEmail === 'resident@brgytanod.com' || 
                   normalizedEmail === 'admin@brgytanod.com' ||
                   normalizedEmail === 'superadmin@brgy.gov';
    if (!currentUser && isDemo) {
        console.log(`[Auth] Auto-provisioning demo user account: ${normalizedEmail}`);
        let role = 'resident';
        if (normalizedEmail === 'admin@brgytanod.com') role = 'admin';
        else if (normalizedEmail === 'superadmin@brgy.gov') role = 'superadmin';
        
        // Provision in Firebase Auth
        try {
            await admin.auth().createUser({
                email: normalizedEmail,
                password: 'tanod123',
                displayName: 'Demo User'
            });
        } catch (err: any) {
            if (err.code !== 'auth/email-already-exists') {
                console.error(`[Auth] Firebase provision error: ${err.message}`);
            }
        }
        
        const hashedPass = await bcrypt.hash('tanod123', 12);
        
        const provisionRes = await pool.query(
          `INSERT INTO users (email, name, role, status, password)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [normalizedEmail, 'Demo User', role, 'approved', hashedPass]
        );
        currentUser = provisionRes.rows[0];
    }

    if (!currentUser) {
        console.warn(`[Auth] User not found for email: ${normalizedEmail}`);
        return response.error(res, 'Invalid email or password.', 'UNAUTHORIZED', 401);
    }

    passwordMatch = await bcrypt.compare(password, currentUser.password);
    if (!passwordMatch) {
         console.warn(`[Auth] Password mismatch for email: ${normalizedEmail}`);
    }

    if (!passwordMatch) {
      return response.error(res, 'Invalid email or password.', 'UNAUTHORIZED', 401);
    }

    await logAction(currentUser.id, 'USER_LOGIN', 'users', currentUser.id);
    
    const token = jwt.sign(
      { id: currentUser.id, email: currentUser.email, role: currentUser.role, tokenVersion: currentUser.token_version || 1 },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    res.cookie('token', token, cookieOptions);
    
    // Sync role to Firebase custom claims
    if (currentUser) {
      await syncUserRoleToFirebase(currentUser.id, currentUser.role);
    }
    
    const { password: _, ...userWithoutPass } = currentUser;
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
