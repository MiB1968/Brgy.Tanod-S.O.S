import dotenv from 'dotenv';
dotenv.config();

// ── Hard-fail on missing critical secrets in production ──────────────────────
if (process.env.NODE_ENV === 'production') {
  const REQUIRED = ['JWT_SECRET', 'DATABASE_URL', 'CORS_ORIGIN'];
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      `\n[FATAL] Missing required environment variables: ${missing.join(', ')}\n` +
      'The server cannot start safely without these values set.\n' +
      'Set them in your .env file or hosting dashboard and restart.\n'
    );
    process.exit(1);
  }
}

export const config = {
  // Port now reads from environment — required for cloud hosts (Railway, Render, etc.)
  port: Number(process.env.PORT) || 3000,

  nodeEnv: process.env.NODE_ENV || 'development',

  // NO unsafe fallback. Dev gets a long random string; prod fails above if unset.
  jwtSecret:
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== 'production'
      ? 'DEV_ONLY_jwt_secret_change_before_deploy_32chars'
      : ''),

  databaseUrl: (process.env.COCKROACH_URL || process.env.DATABASE_URL || '')
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, ''),

  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
  guardianAiKey:
    (process.env.GUARDIAN_AI_KEY || process.env.GEMINI_API_KEY)?.trim() || null,
  geminiModel: (process.env.GEMINI_MODEL || 'gemini-1.5-flash').replace(/^models\//, ''),

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
      const vid = (process.env.JARVIS_VOICE_ID || 'llN1Ei50DSCIEuoOIaH7').trim();
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
    projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
  },
};
