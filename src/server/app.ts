import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { setupRoutes } from './routes/index';
import { globalLimiter, authLimiter, sosLimiter, apiKeyAuthLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/error';
import { config } from './config/index';
import { requestIdMiddleware } from './middleware/requestId';

const app = express();

app.set('trust proxy', 1);
app.use(requestIdMiddleware);

const allowedOrigins: string[] = config.corsOrigin
  ? config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

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
    contentSecurityPolicy: config.nodeEnv === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["*"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'", 
          "'wasm-unsafe-eval'", 
          "blob:",              
          "https://www.gstatic.com",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.tile.openstreetmap.org',
          'https://*.openstreetmap.org'
        ],
        connectSrc: [
          "'self'",
          "https:",
          "wss:",
          "ws:",
          "https://*.googleapis.com",
          "https://*.firebaseio.com",
          "https://api.elevenlabs.io",
          "https://huggingface.co",
          "https://*.huggingface.co",
          "https://cdn-lfs.huggingface.co",
          "https://cdn-lfs-us-1.huggingface.co",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net",
        ],
        mediaSrc: ["'self'", 'blob:', 'https://assets.mixkit.co'],
        frameSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        workerSrc: ["'self'", "blob:"],
      }
    } : false, // Disable CSP in dev for easier debugging
    frameguard: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true
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
