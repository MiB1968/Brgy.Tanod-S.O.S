import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index';

// Route imports
import authRoutes from './routes/authRoutes';
import syncRoutes from './routes/syncRoutes';
import systemRoutes from './routes/systemRoutes';
import sosRoutes from './routes/sosRoutes';
import { errorHandler, notFoundHandler } from './middleware/error';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  frameguard: false,
}));

app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 20, // Strict: 20 attempts per 15 minutes
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Please try again later.' } },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const sosLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  limit: 5, // 5 SOS attempts per minute
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many SOS requests. Please use the existing alert chat.' } },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/sos/alert', sosLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/sos', sosRoutes);

// Health Check
app.get('/api/health', async (req, res) => {
  const { checkConnection } = await import('./db/index');
  const dbConnected = await checkConnection();
  
  res.json({ 
    success: true, 
    status: dbConnected ? 'operational' : 'degraded', 
    db: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString() 
  });
});

// Error Handling (MOVED TO server.ts to avoid blocking Vite/SPA logic)
// app.use(notFoundHandler);
// app.use(errorHandler);

export default app;
