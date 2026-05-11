import { rateLimit } from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 2000, // Increased limit for heavy synchronization
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 20, // Strict: 20 attempts per 15 minutes
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Please try again later.' } },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

export const sosLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  limit: 5, // 5 SOS attempts per minute
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many SOS requests. Please use the existing alert chat.' } },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

export const sosRateLimiter = sosLimiter;

export const strictRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  limit: 10,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please try again later.' } },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
