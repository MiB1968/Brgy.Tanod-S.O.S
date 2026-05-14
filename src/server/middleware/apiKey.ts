import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index';

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== config.apiSecretKey) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API Key' },
    });
  }

  next();
}
