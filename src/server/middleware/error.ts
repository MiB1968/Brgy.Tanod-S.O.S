import { Request, Response, NextFunction } from 'express';
import * as response from '../utils/response';

export interface AppError extends Error {
  status?: number;
  code?: string;
}

export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
  console.error(`[ERROR] ${new Date().toISOString()} - ${err.message}`);
  if (err.stack) console.error(err.stack);

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Something went wrong on the server';

  response.error(res, message, code, status);
}

export function notFoundHandler(req: Request, res: Response) {
  response.error(res, `Route ${req.originalUrl} not found`, 'NOT_FOUND', 404);
}
