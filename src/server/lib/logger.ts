import pino from 'pino';
import { config } from '../config/index';

const transport = config.nodeEnv !== 'production'
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss Z',
      },
    }
  : undefined;

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: config.nodeEnv === 'production' ? { service: 'brgy-tanod-sos' } : undefined,
  transport,
});
