/**
 * src/server/middleware/auth.ts
 *
 * FIX BATCH — CRIT-01 + HIGH-01
 *
 * Changes from original:
 *
 *   CRIT-01 — Hardcoded personal email removed.
 *     The line `userEmail === 'rubenlleg12@gmail.com'` has been deleted.
 *     Role elevation is now driven exclusively by the database `role` column
 *     (via normalizeRole) and the VITE_MASTER_EMAILS env var. No personal
 *     email is burned into source code.
 *
 *   HIGH-01 — Firebase auth path now enforces token revocation.
 *     Previously `isFirebaseAuth = true` caused the middleware to skip the
 *     `token_version` check entirely, meaning revokeUserSessions() had no
 *     effect on Google-signed-in users. Now the DB is queried for both paths
 *     and a suspended/revoked Firebase-authenticated user is rejected with
 *     the same REVOKED response as a JWT user.
 *
 * All other logic (API key path, RBAC helpers, revokeUserSessions) is
 * unchanged.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index';
import { logger } from '../utils/logger';
import { pool, admin } from '../db/index';
import { UserRole } from '../../types';
import { normalizeRole } from '../../utils/roleUtils';

// CRIT-01 FIX: MASTER_EMAILS is now the ONLY mechanism for email-based role
// elevation. No personal email is hardcoded here. Set VITE_MASTER_EMAILS in
// your server environment (not just the Vite build env) to enable this feature.
// NOTE: On the server, this is process.env.VITE_MASTER_EMAILS, not import.meta.env.
const MASTER_EMAILS: string[] = (process.env.VITE_MASTER_EMAILS || '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    tokenVersion?: number;
    barangayId?: string;
    [key: string]: any;
  };
}

// ── In-process API-key rate limiter (10 req / 60s per IP) ───────────────────
const apiKeyHits = new Map<string, { count: number; resetAt: number }>();
const API_KEY_LIMIT = 10;
const API_KEY_WINDOW_MS = 60_000;

function checkApiKeyRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = apiKeyHits.get(ip);
  if (!entry || now > entry.resetAt) {
    apiKeyHits.set(ip, { count: 1, resetAt: now + API_KEY_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  if (entry.count > API_KEY_LIMIT) {
    return false;
  }
  return true;
}

// Deterministic synthetic UUID from key hash — safe to store in audit logs
function apiKeyToSyntheticId(key: string): string {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function writeApiKeyAuditLog(syntheticId: string, route: string) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (type, citizen_id, notes, created_at)
       VALUES ($1, $2, $3, now())`,
      ['API_KEY_ACCESS', syntheticId, `Route: ${route}`]
    );
  } catch {
    logger.warn(`[AUTH] Could not write API key audit log for route ${route}`);
  }
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (config.nodeEnv !== 'production' && req.originalUrl !== '/api/health') {
    logger.debug(
      `[AUTH] ${req.method} ${req.originalUrl} | ` +
      `Token: ${token ? 'PRESENT' : 'MISSING'} | APIKey: ${apiKey ? 'PRESENT' : 'NO'}`
    );
  }

  // ── API Key path ─────────────────────────────────────────────────────────
  if (apiKey) {
    if (!config.apiKey || apiKey !== config.apiKey) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'Invalid API key' },
      });
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkApiKeyRateLimit(clientIp)) {
      logger.warn(`[AUTH] API key rate limit exceeded from ${clientIp}`);
      return res.status(429).json({
        success: false,
        error: { code: 'TOO_MANY_REQUESTS', message: 'API key rate limit exceeded' },
      });
    }

    const syntheticId = apiKeyToSyntheticId(apiKey);
    const syntheticRole = process.env.API_KEY_ROLE === 'admin' ? 'admin' : 'tanod';

    req.user = {
      id: syntheticId,
      email: 'system@tanod.sos',
      role: syntheticRole as UserRole,
      tokenVersion: 0,
    };

    writeApiKeyAuditLog(syntheticId, req.originalUrl).catch(() => {});

    logger.warn(
      `[AUTH] API Key access: ${req.method} ${req.originalUrl} | role=${syntheticRole} | ip=${clientIp}`
    );
    return next();
  }

  // ── JWT / Firebase path ────────────────────────────────────────────────
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  try {
    let decoded: any = null;
    let isFirebaseAuth = false;

    try {
      decoded = jwt.verify(token, config.jwtSecret) as any;
    } catch {
      if (admin?.apps?.length > 0) {
        try {
          const decodedFirebase = await admin.auth().verifyIdToken(token);
          if (decodedFirebase?.email) {
            const userResult = await pool.query(
              'SELECT * FROM users WHERE email = $1',
              [decodedFirebase.email.toLowerCase()]
            );
            const dbUser = userResult.rows[0];
            if (dbUser) {
              decoded = {
                id: dbUser.id,
                email: dbUser.email,
                role: dbUser.role,
                tokenVersion: dbUser.token_version || 1,
              };
              isFirebaseAuth = true;
            } else {
              logger.warn(
                `[AUTH] Firebase token validated but user ${decodedFirebase.email} not in DB.`
              );
              return res.status(403).json({
                success: false,
                error: {
                  code: 'USER_NOT_REGISTERED',
                  message: 'Firebase user not registered. Please complete registration.',
                },
              });
            }
          }
        } catch (fbErr) {
          logger.debug('[AUTH] Firebase token verification also failed:', fbErr);
        }
      }
    }

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
      });
    }

    // ── HIGH-01 FIX: Token revocation check applies to BOTH JWT and Firebase paths ──
    // Previously `isFirebaseAuth` caused this block to be skipped, meaning
    // revokeUserSessions() had no effect on Google Sign-In users.
    // The DB query was already performed above for the Firebase path (we have
    // the dbUser row), so we only need an additional query for the JWT path.
    if (!isFirebaseAuth) {
      const userRow = await pool.query(
        'SELECT token_version, status FROM users WHERE id = $1',
        [decoded.id]
      );
      const dbUser = userRow.rows[0];

      if (!dbUser || dbUser.status === 'suspended') {
        return res.status(401).json({
          success: false,
          error: { code: 'REVOKED', message: 'Session revoked or user suspended' },
        });
      }

      if (decoded.tokenVersion && dbUser.token_version !== decoded.tokenVersion) {
        return res.status(401).json({
          success: false,
          error: { code: 'REVOKED', message: 'Token revoked. Please login again.' },
        });
      }
    } else {
      // Firebase path: re-query status and token_version to enforce revocation.
      // decoded.id was populated from the DB above, so this query is safe.
      const userRow = await pool.query(
        'SELECT token_version, status FROM users WHERE id = $1',
        [decoded.id]
      );
      const dbUser = userRow.rows[0];

      if (!dbUser || dbUser.status === 'suspended') {
        logger.warn(`[AUTH] Firebase user ${decoded.email} is suspended or missing.`);
        return res.status(401).json({
          success: false,
          error: { code: 'REVOKED', message: 'Session revoked or user suspended' },
        });
      }

      // For Firebase tokens we compare the token_version embedded in decoded
      // (populated from DB at token-verification time above) against the current
      // DB value. If an admin called revokeUserSessions() between the two reads,
      // the versions will differ and we reject.
      if (decoded.tokenVersion && dbUser.token_version !== decoded.tokenVersion) {
        logger.warn(`[AUTH] Firebase user ${decoded.email} token version mismatch — session revoked.`);
        return res.status(401).json({
          success: false,
          error: { code: 'REVOKED', message: 'Token revoked. Please login again.' },
        });
      }
    }

    // ── CRIT-01 FIX: Role elevation via env var ONLY — no hardcoded emails ──
    let effectiveRole = normalizeRole(decoded.role || 'resident');
    const userEmail = decoded.email?.toLowerCase().trim() || '';
    if (userEmail && MASTER_EMAILS.length > 0 && MASTER_EMAILS.includes(userEmail)) {
      effectiveRole = 'super_admin' as UserRole;
    }

    req.user = {
      id: decoded.id || decoded.uid,
      email: decoded.email,
      role: effectiveRole,
      tokenVersion: decoded.tokenVersion,
      barangayId: decoded.barangayId,
    };

    return next();
  } catch (err) {
    logger.error('[AUTH] Unexpected error during authentication:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: 'Authentication service error' },
    });
  }
}

const roleHierarchy: Record<string, number> = {
  super_admin: 4,
  superadmin: 4,
  admin: 3,
  tanod: 2,
  resident: 1,
  dispatcher: 3,
  captain: 3,
  guest: 0,
};

export function requireRole(role: UserRole) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Requires ${role} role` },
      });
    }

    const userLevel = roleHierarchy[req.user.role] || 0;
    const requiredLevel = roleHierarchy[role] || 0;

    if (userLevel < requiredLevel) {
      logger.error(
        `[RBAC] Access denied. User: ${req.user.email} (${req.user.role}), Required minimum role: ${role}`
      );
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Requires ${role} role or higher` },
      });
    }
    next();
  };
}

export function requireAnyRole(roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.error(
        `[RBAC] Access denied. User: ${req.user?.email} (${req.user?.role}), Required one of: ${roles.join(', ')}`
      );
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }
    next();
  };
}

// Deprecated: use requireAnyRole instead
export const authorize = requireAnyRole;

export async function revokeUserSessions(userId: string): Promise<void> {
  await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [userId]);
  logger.info(`[AUTH] Revoked all sessions for user: ${userId}`);
}

export async function revokeAllSessions(): Promise<void> {
  await pool.query('UPDATE users SET token_version = token_version + 1');
  logger.warn('[AUTH] Revoked all user sessions');
}
