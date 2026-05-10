import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

export const config = {
  port: 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'emergency_broadcast_secret_unsafe',
  databaseUrl: (process.env.COCKROACH_URL || process.env.DATABASE_URL || '')
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, ''),
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
  adminBootstrap: {
    email: process.env.ADMIN_BOOTSTRAP_EMAIL,
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
  }
};


if (!process.env.JWT_SECRET && config.nodeEnv === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable is not set in production.');
}
