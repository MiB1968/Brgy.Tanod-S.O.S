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
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/system', systemRoutes);

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

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
