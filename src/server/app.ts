import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { setupRoutes } from './routes/index';
import { globalLimiter, authLimiter, sosLimiter } from './middleware/rateLimiter';
import { config } from './config/index';

const app = express();

app.set('trust proxy', 1);

// ── Helmet with proper security headers ─────────────────────────────────────
app.use(
  helmet({
    // Content-Security-Policy: allow self + leaflet CDN tiles + socket.io
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Vite dev HMR
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
          'wss:',   // WebSocket (socket.io)
          'ws:',
          'https://generativelanguage.googleapis.com',
          'https://api.elevenlabs.io',
        ],
        mediaSrc: ["'self'", 'blob:'],
        frameSrc: ["'none'"],   // no iframes allowed
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },

    // X-Frame-Options: DENY — prevents clickjacking
    frameguard: { action: 'deny' },

    // All other helmet defaults remain ON (HSTS, noSniff, etc.)
    crossOriginEmbedderPolicy: false, // keep off; needed for Leaflet tile blobs
  })
);

// ── CORS — locked to your deployed URL ──────────────────────────────────────
const allowedOrigins: string[] = config.corsOrigin
  ? config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin header) only in development
      if (!origin) {
        if (config.nodeEnv !== 'production') return callback(null, true);
        return callback(new Error('CORS: server-to-server blocked in production'));
      }
      if (allowedOrigins.length === 0 && config.nodeEnv !== 'production') {
        // Dev with no CORS_ORIGIN set — allow all (convenient for local work)
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/sos/alert', sosLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────
setupRoutes(app);

export default app;
