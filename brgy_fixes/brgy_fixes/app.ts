/**
 * src/server/app.ts
 *
 * FIX BATCH — CRIT-03
 *
 * Change from original:
 *   The CORS handler previously ignored `allowedOrigins` and accepted every
 *   origin unconditionally (`origin: (origin, callback) => callback(null, true)`).
 *   Combined with `credentials: true`, this allowed any website on the internet
 *   to make credentialed cross-origin requests and receive auth cookies.
 *
 *   Now:
 *   - In production: only origins listed in CORS_ORIGIN (comma-separated env var)
 *     are allowed. Requests from unlisted origins receive 403.
 *   - Same-origin requests (origin === undefined, e.g. Postman, server-to-server)
 *     are always allowed so ops tooling continues to work.
 *   - If CORS_ORIGIN is empty in production, the server logs a startup warning
 *     and falls back to same-origin only (no cross-origin allowed).
 *   - In development (NODE_ENV !== 'production'): all origins are allowed to
 *     preserve the local dev experience.
 *
 * All other middleware and route setup is unchanged.
 */

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { setupRoutes } from './routes/index';
import {
  globalLimiter,
  authLimiter,
  sosLimiter,
  apiKeyAuthLimiter,
} from './middleware/rateLimiter';
import { errorHandler } from './middleware/error';
import { config } from './config/index';
import { requestIdMiddleware } from './middleware/requestId';

const app = express();

app.set('trust proxy', 1);
app.use(requestIdMiddleware);

// ── CRIT-03 FIX: Build the allowed-origins list from config ─────────────────
const allowedOrigins: string[] = config.corsOrigin
  ? config.corsOrigin
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  : [];

if (config.nodeEnv === 'production' && allowedOrigins.length === 0) {
  console.warn(
    '[CORS] WARNING: CORS_ORIGIN is not set. Cross-origin requests will be ' +
      'rejected in production. Set CORS_ORIGIN to your frontend domain(s).'
  );
}

// ── Bug 1 Fix: COOP + COEP headers removed/commented ────────────────────────
// WebLLM uses SharedArrayBuffer when available. However, in an iframe environment
// (like the AI Studio preview), setting COOP and COEP is rejected by the browser or
// blocks normal API/CORS fetches, causing "Failed to fetch" on standard relative requests.
// We remove them to ensure the web application is fully operational.
app.use((_req, res, next) => {
  // Relaxed to prevent blocking iframe fetches
  next();
});

app.use(
  helmet({
    contentSecurityPolicy:
      config.nodeEnv === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              frameAncestors: ['*'],
              scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "'wasm-unsafe-eval'",
                'blob:',
                'https://www.gstatic.com',
                'https://unpkg.com',
                'https://cdn.jsdelivr.net',
              ],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
              imgSrc: [
                "'self'",
                'data:',
                'blob:',
                'https://*.tile.openstreetmap.org',
                'https://*.openstreetmap.org',
              ],
              connectSrc: [
                "'self'",
                'https:',
                'wss:',
                'ws:',
                'https://*.googleapis.com',
                'https://*.firebaseio.com',
                'https://api.elevenlabs.io',
                'https://huggingface.co',
                'https://*.huggingface.co',
                'https://cdn-lfs.huggingface.co',
                'https://cdn-lfs-us-1.huggingface.co',
                'https://unpkg.com',
                'https://cdn.jsdelivr.net',
              ],
              mediaSrc: ["'self'", 'blob:', 'https://assets.mixkit.co'],
              frameSrc: ["'self'", 'https:'],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              workerSrc: ["'self'", 'blob:'],
            },
          }
        : false, // Disable CSP in dev for easier debugging
    frameguard: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ── CRIT-03 FIX: Enforce allowedOrigins — was `origin: () => true` (wildcard) ──
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / non-browser requests (Postman, server-to-server, etc.)
      if (!origin) return callback(null, true);

      // In development allow all origins for convenience
      if (config.nodeEnv !== 'production') return callback(null, true);

      // In production: enforce the allowlist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  if (req.headers['x-api-key']) {
    return apiKeyAuthLimiter(req, res, next);
  }
  next();
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/sos/alert', sosLimiter);

setupRoutes(app);

// Error Handler
app.use(errorHandler);

export default app;
