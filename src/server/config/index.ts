import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

let firebaseAppletConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (parsed.apiKey === 'AIzaSyCiRKS_NqYGHrY_kMz_mY4e0xwE3rUD5bI') {
      throw new Error(
        '[CONFIG] firebase-applet-config.json still contains the revoked API key. ' +
        'Please rotate the key in Firebase Console and update your local file.'
      );
    }
    firebaseAppletConfig = parsed;
  }
} catch (e: any) {
  // If not found, ignore
  console.warn('[CONFIG] Failed to parse firebase-applet-config.json:', e.message);
}

// ── Check missing critical secrets ──────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is missing.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL && !process.env.COCKROACH_URL) {
    console.error('FATAL: DATABASE_URL/COCKROACH_URL environment variable is missing.');
    process.exit(1);
  }
}

export const config = {
  port: 3000,

  nodeEnv: process.env.NODE_ENV || (process.argv[1]?.includes('dist') ? 'production' : 'development'),

  // NO unsafe fallback. Dev gets a long random string; prod fails above if unset.
  jwtSecret: (() => {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production') {
      // Should have been caught by the check above, but for safety:
      throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
    }
    return crypto.randomBytes(32).toString('hex');
  })(),

  databaseUrl: (process.env.COCKROACH_URL || process.env.DATABASE_URL || '')
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, ''),

  geminiApiKey: (process.env.MY_GEMINI_SECRET || process.env.GEMINI_API_KEY)?.trim() || null,
  guardianAiKey:
    (process.env.GUARDIAN_AI_KEY || process.env.MY_GEMINI_SECRET || process.env.GEMINI_API_KEY)?.trim() || null,
  geminiModel: (() => {
    let m = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    if (m.startsWith('AIza')) m = 'gemini-2.0-flash';
    return m.replace(/^models\//, '');
  })(),

  adminBootstrap: {
    email: process.env.ADMIN_BOOTSTRAP_EMAIL,
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  },

  // Default is now EMPTY STRING, not '*'. Forces explicit configuration.
  corsOrigin: process.env.CORS_ORIGIN || '',

  elevenLabs: {
    apiKeys: (process.env.ELEVENLABS_API_KEYS || process.env.ELEVENLABS_API_KEY || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
    voiceId: (() => {
      // Adam (pNInz6obpgDQGcFmaJgB) - Male, fluent Tagalog
      const vid = (process.env.JARVIS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB').trim();
      if (vid.includes('voiceId=')) {
        const parts = vid.split('voiceId=');
        if (parts[1]) return parts[1].split('&')[0];
      }
      if (vid.includes('/')) return vid.split('/').pop() || vid;
      return vid;
    })(),
  },

  fishAudio: {
    apiKeys: (process.env.FISHAUDIO_API_KEYS || process.env.FISHAUDIO_API_KEY || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  },

  firebase: {
    projectId: firebaseAppletConfig.projectId || process.env.FIREBASE_PROJECT_ID || 'demo-project',
    databaseId: firebaseAppletConfig.firestoreDatabaseId || '(default)',
  },
  apiKey: process.env.API_KEY || null,
  
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    statusCallbackUrl: process.env.TWILIO_SMS_WEBHOOK_URL,
    enabled: process.env.SMS_FALLBACK_ENABLED === 'true',
    maxRecipients: parseInt(process.env.MAX_SMS_RECIPIENTS_PER_ALERT || '10'),
    fallbackDelayMinutes: parseInt(process.env.SMS_FALLBACK_DELAY_MINUTES || '5'),
  }
};
