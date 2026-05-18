import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { setupRoutes } from './routes/index';
import { globalLimiter, authLimiter, sosLimiter, apiKeyAuthLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/error';
import { config } from './config/index';

const app = express();

app.set('trust proxy', 1);

const allowedOrigins: string[] = config.corsOrigin
  ? config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

// ── Bug 1 Fix: COOP + COEP headers ────────────────────────────────────────────
// WebLLM uses SharedArrayBuffer for multi-threaded WASM.
// Browsers only expose SharedArrayBuffer when the page is "cross-origin isolated",
// which requires BOTH of these headers on every response:
//   Cross-Origin-Opener-Policy: same-origin
//   Cross-Origin-Embedder-Policy: require-corp
//
// These are applied BEFORE helmet so they aren't overridden.
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        // ── Bug 2a Fix: 'wasm-unsafe-eval' ──────────────────────────────────
        // Without this, browsers refuse to JIT-compile the WebLLM WASM module.
        // 'blob:' is needed for WebLLM's dynamically created worker scripts.
        scriptSrc: [
          "'self'",
          "'wasm-unsafe-eval'", // Required for WebLLM WASM JIT compilation
          "blob:",              // Required for WebLLM dynamic worker scripts
        ],

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
          "https:",
          "wss:",
          "ws:",
          "https://*.googleapis.com",
          "https://*.firebaseio.com",
          "https://api.elevenlabs.io",
          // WebLLM downloads the Qwen2 model from HuggingFace CDN
          "https://huggingface.co",
          "https://*.huggingface.co",
          "https://cdn-lfs.huggingface.co",
          "https://cdn-lfs-us-1.huggingface.co",
        ],
        mediaSrc: ["'self'", 'blob:'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],

        // ── Bug 2b Fix: worker-src blob: ────────────────────────────────────
        // WebLLM spawns Web Workers from blob: URLs at runtime.
        // Without this directive the browser silently blocks all WebLLM workers
        // and the engine never initialises.
        workerSrc: ["'self'", "blob:"],
      }
    },
    frameguard: false,

    // ── Bug 1 Fix (continued) ────────────────────────────────────────────────
    // crossOriginEmbedderPolicy was false, which disabled the COEP header that
    // helmet would otherwise set. We now set it manually above, so we still
    // disable helmet's version here to avoid a duplicate/conflicting header.
    crossOriginEmbedderPolicy: false,
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
