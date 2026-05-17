import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index';
import { logger } from '../utils/logger';
import { pool } from '../db/index';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tokenVersion?: number;
    [key: string]: any;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  const apiKey = req.headers['x-api-key'];

  // Check for API Key first, if present and valid, skip JWT
  if (apiKey && config.apiKey && apiKey === config.apiKey) {
    req.user = {
      id: 'system',
      email: 'system@tanod.sos',
      role: 'admin',
      tokenVersion: 0
    };
    logger.warn(`[AUTH] API Key usage detected. Route: ${req.originalUrl}`);
    return next();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;

    // Verify token_version hasn't been revoked
    (async () => {
      try {
        const result = await pool.query(
          'SELECT token_version FROM users WHERE id = $1',
          [decoded.id]
        );

        if (!result.rows[0]) {
          return res.status(401).json({
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'User not found' }
          });
        }

        const currentTokenVersion = result.rows[0].token_version || 1;
        
        const decodedVer = Number(decoded.tokenVersion || 1);
        const dbVer = Number(currentTokenVersion);

        if (decodedVer !== dbVer) {
          logger.warn(`[AUTH] Token revoked for user: ${decoded.id} (Token: ${decodedVer}, DB: ${dbVer})`);
          return res.status(401).json({
            success: false,
            error: { code: 'TOKEN_REVOKED', message: 'Your session has been invalidated. Please log in again.' }
          });
        }

        req.user = { ...decoded, tokenVersion: currentTokenVersion };
        logger.info(`[AUTH] Authenticated user: ${req.user.id} role: ${req.user.role}`);
        next();
      } catch (err) {
        logger.error('[AUTH] Token version check failed:', err);
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Authentication check failed' }
        });
      }
    })();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    });
  }
}

export function authorize(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Only log if something goes wrong to reduce noise
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
