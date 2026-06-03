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
    const syntheticRole = (process.env.API_KEY_ROLE === 'admin') ? 'admin' : 'tanod';

    req.user = {
      id: syntheticId,
      email: 'system@tanod.sos',
      role: syntheticRole,
      tokenVersion: 0,
    };

    writeApiKeyAuditLog(syntheticId, req.originalUrl).catch(() => {});

    logger.warn(`[AUTH] API Key access: ${req.method} ${req.originalUrl} | role=${syntheticRole} | ip=${clientIp}`);
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
              logger.warn(`[AUTH] Firebase token validated but user ${decodedFirebase.email} not in DB.`);
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

    const isMasterUser = decoded.email === 'rubenlleg12@gmail.com' || decoded.email === 'ben@brgytanod.com';
    let effectiveRole = decoded.role || 'resident';
    if (isMasterUser) {
      effectiveRole = 'superadmin';
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

export function authorize(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.error(`[AUTH] Authorization failed. User: ${JSON.stringify(req.user)}, Required roles: ${roles.join(', ')}`);
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } 
      });
    }
    next();
  };
}

export async function revokeUserSessions(userId: string): Promise<void> {
  await pool.query(
    'UPDATE users SET token_version = token_version + 1 WHERE id = $1',
    [userId]
  );
  logger.info(`[AUTH] Revoked all sessions for user: ${userId}`);
}

export async function revokeAllSessions(): Promise<void> {
  await pool.query('UPDATE users SET token_version = token_version + 1');
  logger.warn('[AUTH] Revoked all user sessions');
}
