import { Request, Response, NextFunction } from 'express';
import * as response from '../utils/response';

export class AppError extends Error {
  constructor(
    public message: string,
    public status = 500,
    public code = 'INTERNAL_SERVER_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}


export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`[ERROR] ${new Date().toISOString()} - ${err.message || err}`);
  if (err.stack) console.error(err.stack);

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Something went wrong on the server';

  response.error(res, message, code, status);
}

export function notFoundHandler(req: Request, res: Response) {
  response.error(res, `Route ${req.originalUrl} not found`, 'NOT_FOUND', 404);
}
