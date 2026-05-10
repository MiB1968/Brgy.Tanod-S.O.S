import { config } from '../config/index';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

type Level = keyof typeof levels;

const log = (level: Level, message: string, meta?: any) => {
  if (levels[level] <= levels.info || config.nodeEnv !== 'production') {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`);
  }
};

export const logger = {
  info: (msg: string, meta?: any) => log('info', msg, meta),
  error: (msg: string, meta?: any) => log('error', msg, meta),
  warn: (msg: string, meta?: any) => log('warn', msg, meta),
  debug: (msg: string, meta?: any) => log('debug', msg, meta),
};
