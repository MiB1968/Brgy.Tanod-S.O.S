import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'emergency_broadcast_secret_unsafe',
  databaseUrl: (process.env.COCKROACH_URL || process.env.DATABASE_URL || '')
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, ''),
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
  guardianAiKey: (process.env.GUARDIAN_AI_KEY || process.env.GEMINI_API_KEY)?.trim() || null,
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash", // Stable standard, allow override
  adminBootstrap: {
    email: process.env.ADMIN_BOOTSTRAP_EMAIL,
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
  elevenLabs: {
    apiKeys: (process.env.ELEVENLABS_API_KEYS || process.env.ELEVENLABS_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean),
    voiceId: (() => {
      const vid = (process.env.JARVIS_VOICE_ID || 'llN1Ei50DSCIEuoOIaH7').trim();
      // Handle the case where the user pasted the entire Jamie voice URL
      if (vid.includes('voiceId=')) {
        const parts = vid.split('voiceId=');
        if (parts[1]) return parts[1].split('&')[0];
      }
      if (vid.includes('/')) {
        return vid.split('/').pop() || vid;
      }
      return vid;
    })(),
  },
  fishAudio: {
    apiKeys: (process.env.FISHAUDIO_API_KEYS || process.env.FISHAUDIO_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean),
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
  }
};


if (!process.env.JWT_SECRET && config.nodeEnv === 'production') {
  console.error('CRITICAL WARNING: JWT_SECRET environment variable is not set in production. Using fallback secret. THIS IS INSECURE!');
}
