import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index';
import fs from 'fs';
import path from 'path';

function logToFile(message: string) {
  const logPath = path.join(process.cwd(), 'auth.log');
  fs.appendFileSync(logPath, `${new Date().toISOString()}: ${message}\n`);
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: any;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  const apiKey = req.headers['x-api-key'];

  // Check for API Key first, if present and valid, skip JWT
  if (apiKey && config.apiKey && apiKey === config.apiKey) {
    // Treat as system-level user
    req.user = {
      id: 'system',
      email: 'system@tanod.sos',
      role: 'admin' // Or some kind of system role
    };
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
    req.user = decoded;
    logToFile(`[AUTH] Authenticated user: ${req.user.id} role: ${req.user.role}`);
    next();
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
      console.error(`[AUTH] Authorization failed. User: ${JSON.stringify(req.user)}, Required roles: ${roles.join(', ')}`);
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } 
      });
    }
    next();
  };
}
