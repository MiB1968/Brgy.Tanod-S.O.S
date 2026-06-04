import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export const requestContext = new AsyncLocalStorage<Map<string, string>>();

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  // Set the header for the response
  res.setHeader('x-request-id', requestId);

  const context = new Map<string, string>();
  context.set('requestId', requestId);

  requestContext.run(context, () => {
    next();
  });
};

export const getRequestId = () => {
  const context = requestContext.getStore();
  return context?.get('requestId');
};
