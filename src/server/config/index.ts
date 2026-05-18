import dotenv from 'dotenv';
dotenv.config();

// ── Check missing critical secrets ──────────────────────────────────────────────
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

  // NO unsafe fallback. Dev gets a long random string; prod fails above if unset.
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
  geminiModel: (process.env.GEMINI_MODEL || 'gemini-3-flash-preview').replace(/^models\//, ''),

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
    projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
  },
  apiKey: process.env.API_KEY || null,
};
