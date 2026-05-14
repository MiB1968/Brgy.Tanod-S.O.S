import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { setupRoutes } from './routes/index';
import { globalLimiter, authLimiter, sosLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/error';
import { requireApiKey } from './middleware/apiKey';
import { config } from './config/index';

const app = express();

app.set('trust proxy', 1);

const allowedOrigins: string[] = config.corsOrigin
  ? config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc:
          config.nodeEnv === 'production'
            ? ["'self'", 'https://fonts.googleapis.com']
            : ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
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
          'wss:',
          'ws:',
          'https://generativelanguage.googleapis.com',
          'https://api.elevenlabs.io'
        ],
        mediaSrc: ["'self'", 'blob:'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    frameguard: { action: 'sameorigin' },
    crossOriginEmbedderPolicy: false
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      const isStudioPreview =
        !!origin &&
        (origin.endsWith('.run.app') || origin.startsWith('http://localhost:3000'));

      const isDevFallback =
        allowedOrigins.length === 0 && config.nodeEnv !== 'production';

      if (
        !origin ||
        origin === 'null' ||
        isStudioPreview ||
        isDevFallback ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      console.warn(`[CORS] Origin rejected: ${origin}`);
      return callback(null, false);
    },
    credentials: true
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/', globalLimiter);
app.use('/api/', requireApiKey);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/sos/alert', sosLimiter);

setupRoutes(app);

// Error Handler
app.use(errorHandler);

export default app;
