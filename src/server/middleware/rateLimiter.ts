import { rateLimit } from "express-rate-limit";

// ── NOTE FOR FUTURE SCALING ───────────────────────────────────────────────────
// These limiters use in-memory storage. They work correctly on a single server
// instance. If you ever scale to multiple servers (load balancing), replace the
// default store with a Redis store:
//   npm install rate-limit-redis ioredis
//   import RedisStore from 'rate-limit-redis';
//   store: new RedisStore({ client: redisClient })
// ─────────────────────────────────────────────────────────────────────────────

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 500, // Tightened from 1000
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health", // health checks don't count
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please slow down.",
    },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // 20 login/register attempts per 15 minutes
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many login attempts. Please try again in 15 minutes.",
    },
  },
});

export const apiKeyAuthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many API key authentication attempts. Please contact support.",
    },
  },
  skip: (req) => !req.headers['x-api-key'],
});

export const sosLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 20, // 20 SOS per minute per IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many SOS requests. Please use the active alert chat.",
    },
  },
});

// Alias for backward compatibility
export const sosRateLimiter = sosLimiter;

export const strictRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later.",
    },
  },
});
