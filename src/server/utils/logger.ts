import { getRequestId } from '../middleware/requestId';

export const logger = {
  info: (message: string, meta?: any) => {
    const requestId = getRequestId();
    const reqPart = requestId ? ` [${requestId}]` : '';
    console.log(`\x1b[36m[INFO]\x1b[0m ${new Date().toISOString()}${reqPart} - ${message}`, meta || '');
  },
  error: (message: string, error?: any) => {
    const requestId = getRequestId();
    const reqPart = requestId ? ` [${requestId}]` : '';
    console.error(`\x1b[31m[ERROR]\x1b[0m ${new Date().toISOString()}${reqPart} - ${message}`, error || '');
  },
  warn: (message: string, meta?: any) => {
    const requestId = getRequestId();
    const reqPart = requestId ? ` [${requestId}]` : '';
    console.warn(`\x1b[33m[WARN]\x1b[0m ${new Date().toISOString()}${reqPart} - ${message}`, meta || '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      const requestId = getRequestId();
      const reqPart = requestId ? ` [${requestId}]` : '';
      console.debug(`\x1b[90m[DEBUG]\x1b[0m ${new Date().toISOString()}${reqPart} - ${message}`, meta || '');
    }
  }
};
