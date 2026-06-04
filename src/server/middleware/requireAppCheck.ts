import { Request, Response, NextFunction } from 'express';
import { admin } from '../db/index';
import { logger } from '../utils/logger';
import { config } from '../config/index';

export async function requireAppCheck(req: Request, res: Response, next: NextFunction) {
  // Allow bypassing app check if valid API key is present for system-to-system calls
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey && config.apiKey && apiKey === config.apiKey) {
    return next();
  }

  // In development, you might want to bypass or mock App Check if you are doing simple local testing 
  // without the Debug provider.
  if (config.nodeEnv !== 'production' && !req.headers['x-firebase-appcheck']) {
     logger.debug(`[AppCheck] Bypassed in development mode for ${req.originalUrl}`);
     return next();
  }

  const appCheckToken = req.headers['x-firebase-appcheck'] as string;

  if (!appCheckToken) {
    logger.warn(`[AppCheck] Missing App Check token on ${req.method} ${req.originalUrl}`);
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized: Firebase App Check token is missing.' },
    });
  }

  try {
    const appCheckClaims = await admin.appCheck().verifyToken(appCheckToken);
    
    // Attach the app check claims to the request if needed
    (req as any).appCheck = appCheckClaims;
    
    return next();
  } catch (err: any) {
    logger.warn(`[AppCheck] Verification failed on ${req.method} ${req.originalUrl}: ${err.message}`);
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized: Invalid Firebase App Check token.' },
    });
  }
}
