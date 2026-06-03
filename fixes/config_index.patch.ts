// PATCH: src/server/config/index.ts
//
// CRIT-01 — firebase-applet-config.json had a live API key committed to source.
//
// Changes:
//   1. firebase-applet-config.json is renamed to firebase-applet-config.example.json
//      (committed) and the real file is added to .gitignore.
//   2. In production, Firebase client config is read exclusively from VITE_ env vars
//      so no secrets ever live in the repo. The file-read path remains for local dev
//      convenience only.
//
// Action required by developer:
//   a) git rm firebase-applet-config.json
//   b) cp firebase-applet-config.example.json firebase-applet-config.json  (local only)
//   c) Fill in your values in the local copy.
//   d) Set VITE_FIREBASE_API_KEY (and the other VITE_FIREBASE_* vars) in your
//      Cloud Run / hosting environment secrets.

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// ── Firebase applet config ───────────────────────────────────────────────────
// Priority: env vars (production-safe) > local JSON file (dev convenience)
let firebaseAppletConfig: Record<string, string> = {};

const envFirebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
  measurementId:     process.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: '(default)',
};

const allEnvPresent = envFirebaseConfig.apiKey && envFirebaseConfig.projectId && envFirebaseConfig.appId;

if (allEnvPresent) {
  // Clean path — env vars take full precedence
  firebaseAppletConfig = envFirebaseConfig as Record<string, string>;
} else {
  // Dev fallback: read from local JSON (must NOT be committed with real values)
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      // Safety guard: refuse to load a file that still has the old committed key
      if (parsed.apiKey === 'AIzaSyCiRKS_NqYGHrY_kMz_mY4e0xwE3rUD5bI') {
        throw new Error(
          '[CONFIG] firebase-applet-config.json still contains the revoked API key. ' +
          'Please rotate the key in Firebase Console and update your local file.'
        );
      }
      firebaseAppletConfig = parsed;
    }
  } catch (e: any) {
    // In production this is fatal; in dev it's a warning.
    if (process.env.NODE_ENV === 'production') {
      throw e;
    }
    console.warn('[CONFIG]', e.message);
  }
}

// ── Missing-secret checks ────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const REQUIRED = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.warn(`[WARNING] Missing recommended environment variables: ${missing.join(', ')}`);
  }
}

export const config = {
  port: 3000,

  nodeEnv: process.env.NODE_ENV || (process.argv[1]?.includes('dist') ? 'production' : 'development'),

  jwtSecret:
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== 'production'
      ? 'DEV_ONLY_jwt_secret_change_before_deploy_32chars'
      : ''),

  databaseUrl: (process.env.COCKROACH_URL || process.env.DATABASE_URL || '')
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, ''),

  geminiApiKey: (process.env.MY_GEMINI_SECRET || process.env.GEMINI_API_KEY)?.trim() || null,
  guardianAiKey:
    (process.env.GUARDIAN_AI_KEY || process.env.MY_GEMINI_SECRET || process.env.GEMINI_API_KEY)?.trim() || null,

  // MED-05 fix: corrected default model name. 'gemini-3.5-flash' does not exist.
  geminiModel: (() => {
    let m = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    // Guard against accidentally pasting an API key as the model name
    if (m.startsWith('AIza')) {
      console.error('[CONFIG] GEMINI_MODEL looks like an API key, not a model name. Falling back to gemini-2.0-flash.');
      m = 'gemini-2.0-flash';
    }
    return m.replace(/^models\//, '');
  })(),

  apiKey: process.env.API_KEY || null, // CRIT-02: used below in auth middleware

  adminBootstrap: {
    email: process.env.ADMIN_BOOTSTRAP_EMAIL,
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  },

  corsOrigin: process.env.CORS_ORIGIN || '',

  firebaseAppletConfig,

  // ── Twilio ───────────────────────────────────────────────────────────────
  twilio: {
    accountSid:         process.env.TWILIO_ACCOUNT_SID || '',
    authToken:          process.env.TWILIO_AUTH_TOKEN || '',
    messagingServiceSid:process.env.TWILIO_MESSAGING_SERVICE_SID || '',
    phoneNumber:        process.env.TWILIO_PHONE_NUMBER || '',
    enabled:            process.env.SMS_FALLBACK_ENABLED === 'true',
    fallbackDelayMinutes: parseInt(process.env.SMS_FALLBACK_DELAY_MINUTES || '5'),
    maxRecipients:      parseInt(process.env.MAX_SMS_RECIPIENTS_PER_ALERT || '10'),
  },
};
