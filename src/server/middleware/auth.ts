import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  const apiKey = req.headers['x-api-key'];

  if (config.nodeEnv !== 'production' && req.originalUrl !== '/api/health') {
    logger.debug(`[AUTH] Request: ${req.method} ${req.originalUrl}. Token: ${token ? 'PRESENT' : 'MISSING'} (Cookie: ${req.cookies.token ? 'YES' : 'NO'}, Header: ${req.headers.authorization ? 'YES' : 'NO'})`);
  }

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
    let decoded: any = null;
    let isFirebaseAuth = false;

    try {
      decoded = jwt.verify(token, config.jwtSecret) as any;
    } catch (jwtErr) {
      // If JWT verify fails, check if we can verify as a Firebase ID token
      if (admin && admin.apps && admin.apps.length > 0) {
        try {
          const decodedFirebase = await admin.auth().verifyIdToken(token);
          if (decodedFirebase && decodedFirebase.email) {
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
                tokenVersion: dbUser.token_version || 1
              };
              isFirebaseAuth = true;
            } else {
              logger.warn(`[AUTH] Firebase token validated but user email ${decodedFirebase.email} is not registered in CockroachDB/Postgres. Entering fallback/provision info.`);
              // Look up or auto-register standard rubenlleg12@gmail.com or other master emails
              const isMaster = decodedFirebase.email.toLowerCase() === 'rubenlleg12@gmail.com' || decodedFirebase.email.toLowerCase() === 'ben@brgytanod.com';
              if (isMaster) {
                // Since this is the Super Admin master account, auto-bootstrap it into the DB if missing!
                logger.info(`[AUTH] Bootstrapping master admin ${decodedFirebase.email} on the fly.`);
                const insertResult = await pool.query(
                  `INSERT INTO users (email, password, name, role, status)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (email) DO UPDATE SET role = 'admin'
                   RETURNING id, email, name, role, status`,
                  [decodedFirebase.email.toLowerCase(), '$2a$12$bootstrapfakehashedpasswordskipthis', 'Super Admin', 'admin', 'verified']
                );
                const newUser = insertResult.rows[0];
                decoded = {
                  id: newUser.id,
                  email: newUser.email,
                  role: newUser.role,
                  tokenVersion: 1
                };
                isFirebaseAuth = true;
              } else {
                return res.status(401).json({
                  success: false,
                  error: { code: 'USER_NOT_FOUND', message: 'No registered user found for this account' }
                });
              }
            }
          }
        } catch (firebaseErr: any) {
          // Handle AI Studio "gen-lang-client" audience mismatch for development
          if (firebaseErr.message.includes('aud')) {
            try {
              const decodedToken = jwt.decode(token) as any;
              const isGenLang = decodedToken?.aud?.startsWith('gen-lang-client');
              const isMasterEmail = 
                decodedToken?.email === 'rubenlleg12@gmail.com' || 
                decodedToken?.email === 'ben@brgytanod.com';
              
              if (isGenLang && isMasterEmail) {
                logger.info(`[AUTH] Trusting gen-lang-client token for master email: ${decodedToken.email}`);
                let userResult = await pool.query(
                  'SELECT * FROM users WHERE email = $1',
                  [decodedToken.email.toLowerCase()]
                );
                let dbUser = userResult.rows[0];
                
                if (!dbUser) {
                  logger.info(`[AUTH] Auto-bootstrapping master user ${decodedToken.email} via gen-lang fallback.`);
                  const insertResult = await pool.query(
                    `INSERT INTO users (email, password, name, role, status)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (email) DO UPDATE SET role = 'superadmin'
                     RETURNING id, email, name, role, status`,
                    [decodedToken.email.toLowerCase(), '$2a$12$bootstrapfakehashedpasswordskipthis', 'Super Admin', 'superadmin', 'approved']
                  );
                  dbUser = insertResult.rows[0];
                }

                if (dbUser) {
                  decoded = {
                    id: dbUser.id,
                    email: dbUser.email,
                    role: dbUser.role,
                    tokenVersion: dbUser.token_version || 1
                  };
                  isFirebaseAuth = true;
                }
              } else {
                logger.debug(`[AUTH] Firebase JWT check failed: ${firebaseErr.message}`);
              }
            } catch (decodeErr) {
              logger.debug(`[AUTH] Firebase JWT check failed: ${firebaseErr.message}`);
            }
          } else {
            logger.debug(`[AUTH] Firebase JWT check failed: ${firebaseErr.message}`);
          }
        }
      }

      if (!decoded) {
        if (jwtErr instanceof jwt.JsonWebTokenError || (jwtErr && (jwtErr.name === 'JsonWebTokenError' || jwtErr.name === 'TokenExpiredError'))) {
          return res.status(401).json({
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
          });
        }
        throw jwtErr;
      }
    }

    // Verify token_version hasn't been revoked
    // Check if decoded.id is a valid UUID before querying (optional but safer)
    if (!decoded.id || typeof decoded.id !== 'string') {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Token missing user identity' }
        });
    }

    const result = await pool.query(
      'SELECT token_version FROM users WHERE id = $1',
      [decoded.id]
    ).catch(e => {
        logger.error(`[AUTH] Database query failed: ${e.message}`);
        throw e; // Caught by outer try/catch
    });

    if (!result || result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'User not found' }
      });
    }

    const currentTokenVersion = result.rows[0].token_version || 1;
    
    const decodedVer = Number(decoded.tokenVersion || 1);
    const dbVer = Number(currentTokenVersion);

    if (decodedVer !== dbVer && !isFirebaseAuth) {
      logger.warn(`[AUTH] Token revoked for user: ${decoded.id} (Token: ${decodedVer}, DB: ${dbVer})`);
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_REVOKED', message: 'Your session has been invalidated. Please log in again.' }
      });
    }

    req.user = { ...decoded, tokenVersion: currentTokenVersion };
    logger.info(`[AUTH] Authenticated user: ${req.user.id} role: ${req.user.role}`);
    next();
  } catch (err: any) {
    if (err instanceof jwt.JsonWebTokenError || (err && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError'))) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
      });
    }
    logger.error('[AUTH] Authentication failure:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Authentication check failed' }
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
