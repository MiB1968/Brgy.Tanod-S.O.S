// scripts/ensure-config.cjs
// Generates firebase-applet-config.json deterministically at build time.
// Priority: existing valid file > environment variables > fixes/example template > hardcoded fallback.
// Exits non-zero in production if the final config is still placeholder-only.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const configPath = path.join(ROOT, 'firebase-applet-config.json');
const examplePath = path.join(ROOT, 'fixes', 'firebase-applet-config.example.json');

const REQUIRED_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

function fromEnv() {
  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || '',
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || '',
    firestoreDatabaseId: process.env.VITE_FIREBASE_DB_ID || '(default)',
  };
}

function fromExample() {
  if (fs.existsSync(examplePath)) {
    try {
      return JSON.parse(fs.readFileSync(examplePath, 'utf-8'));
    } catch {
      /* fall through */
    }
  }
  return {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: '',
    firestoreDatabaseId: '(default)',
  };
}

function merge(a, b) {
  const out = { ...a };
  for (const k of Object.keys(b)) {
    if (!out[k] || out[k] === '') out[k] = b[k];
  }
  return out;
}

function validate(cfg) {
  return REQUIRED_KEYS.every((k) => cfg[k] && String(cfg[k]).trim().length > 0);
}

console.log('[ensure-config] Hydrating firebase-applet-config.json …');

let existing = {};
if (fs.existsSync(configPath)) {
  try {
    existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    console.warn('[ensure-config] Existing config was malformed, overwriting.');
    existing = {};
  }
}

const envCfg = fromEnv();
const exampleCfg = fromExample();

// Priority: existing valid keys > env vars > example template
let final = merge(existing, envCfg);
final = merge(final, exampleCfg);

// Always coerce firestoreDatabaseId
if (!final.firestoreDatabaseId) final.firestoreDatabaseId = '(default)';

fs.writeFileSync(configPath, JSON.stringify(final, null, 2) + '\n', 'utf-8');
console.log('[ensure-config] Wrote', configPath);

const valid = validate(final);
const isProd =
  process.env.NODE_ENV === 'production' ||
  process.env.CI === 'true' ||
  process.env.GITHUB_ACTIONS === 'true';

if (!valid) {
  const msg =
    '[ensure-config] ⚠️  Config is missing required Firebase keys: ' +
    REQUIRED_KEYS.filter((k) => !final[k]).join(', ');
  if (isProd) {
    console.error(msg);
    console.error(
      '[ensure-config] ❌ Refusing to build production bundle without real Firebase config.'
    );
    process.exit(1);
  } else {
    console.warn(msg);
    console.warn('[ensure-config] Continuing in dev mode with placeholder config.');
  }
} else {
  console.log('[ensure-config] ✅ All required keys present.');
}
