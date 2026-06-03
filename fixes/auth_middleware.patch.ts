// PATCH: src/server/middleware/auth.ts
//
// CRIT-02 — Static API key bypassed ALL rate limiting and left no audit trail.
//
// Changes:
//   1. API key path now applies its own in-middleware rate limiter (10 req/min per IP).
//   2. Every API key usage writes an audit_log row so system-level calls are traceable.
//   3. API key grants 'tanod' role (not 'admin') unless the key is explicitly marked
//      as elevated via API_KEY_ROLE env var. Principle of least privilege.
//   4. The synthetic user id is now a deterministic UUID derived from the key hash
//      so audit rows can be correlated without exposing the raw key.
//
// No other auth logic is changed.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index';
import { logger } from '../utils/logger';
import { pool, admin } from '../db/index';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tokenVersion?: number;
    [key: string]: any;
  };
}

// ── In-process API-key rate limiter (10 req / 60s per IP) ───────────────────
// Intentionally separate from the express-rate-limit middleware so it runs
// inside the auth check regardless of route middleware ordering.
const apiKeyHits = new Map<string, { count: number; resetAt: number }>();
const API_KEY_LIMIT = 10;
const API_KEY_WINDOW_MS = 60_000;

function checkApiKeyRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = apiKeyHits.get(ip);
  if (!entry || now > entry.resetAt) {
    apiKeyHits.set(ip, { count: 1, resetAt: now + API_KEY_WINDOW_MS });
    return true; // allowed
  }
  entry.count += 1;
  if (entry.count > API_KEY_LIMIT) {
    return false; // blocked
  }
  return true;
}

// Deterministic synthetic UUID from key hash — safe to store in audit logs
function apiKeyToSyntheticId(key: string): string {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}

async function writeApiKeyAuditLog(syntheticId: string, route: string) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (type, citizen_id, notes, created_at)
       VALUES ($1, $2, $3, now())`,
      ['API_KEY_ACCESS', syntheticId, `Route: ${route}`]
    );
  } catch {
    // Non-fatal — log to console so ops can investigate if the table is missing
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

    // Rate limit by IP
    const clientIp = (req.ip || req.socket.remoteAddress || 'unknown');
    if (!checkApiKeyRateLimit(clientIp)) {
      logger.warn(`[AUTH] API key rate limit exceeded from ${clientIp}`);
      return res.status(429).json({
        success: false,
        error: { code: 'TOO_MANY_REQUESTS', message: 'API key rate limit exceeded' },
      });
    }

    const syntheticId = apiKeyToSyntheticId(apiKey);
    // Least-privilege default — elevate only if the env explicitly asks for admin
    const syntheticRole = (process.env.API_KEY_ROLE === 'admin') ? 'admin' : 'tanod';

    req.user = {
      id: syntheticId,
      email: 'system@tanod.sos',
      role: syntheticRole,
      tokenVersion: 0,
    };

    // Fire-and-forget audit write (non-blocking)
    writeApiKeyAuditLog(syntheticId, req.originalUrl).catch(() => {});

    logger.warn(`[AUTH] API Key access: ${req.method} ${req.originalUrl} | role=${syntheticRole} | ip=${clientIp}`);
    return next();
  }

  // ── JWT / Firebase path (unchanged from original) ────────────────────────
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  try {
    let decoded: any = null;

    try {
      decoded = jwt.verify(token, config.jwtSecret) as any;
    } catch {
      // JWT verify failed — try Firebase ID token
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
            } else {
              logger.warn(
                `[AUTH] Firebase token validated but user ${decodedFirebase.email} not in DB.`
              );
              // Master admin bootstrap is intentionally removed here.
              // The ADMIN_BOOTSTRAP_EMAIL env var handles first-time setup instead.
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

    req.user = {
      id: decoded.id || decoded.uid,
      email: decoded.email,
      role: decoded.role || 'resident',
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
