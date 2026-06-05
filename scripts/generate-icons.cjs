const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const ICON_SOURCE = path.resolve('assets/icon.png');
const SPLASH_SOURCE = path.resolve('assets/splash.png');

const ICON_BG_LIGHT = '#FFFFFF';
const ICON_BG_DARK = '#000000';

// ── Validation ────────────────────────────────────────────────────────────────
console.log('[Icons] Starting icon generation...');

if (!fs.existsSync(ICON_SOURCE)) {
  console.warn(`[Icons] WARNING: Icon source not found at ${ICON_SOURCE}`);
  console.warn('[Icons] Icon generation skipped (non-blocking for production web deployment)');
  process.exit(0);
}

if (!fs.existsSync(SPLASH_SOURCE)) {
  console.warn(`[Icons] WARNING: Splash source not found at ${SPLASH_SOURCE}`);
  console.warn('[Icons] Splash screen will not be regenerated.');
}

// ── Generate ──────────────────────────────────────────────────────────────────
try {
  const cmd = [
    'npx @capacitor/assets generate',
    `--iconBackgroundColor "${ICON_BG_LIGHT}"`,
    `--iconBackgroundColorDark "${ICON_BG_DARK}"`,
    '--android',
    '--ios',
    '--pwa',       // generate PWA icons for the web manifest
  ].join(' ');

  console.log('[Icons] Running:', cmd);
  execSync(cmd, { stdio: 'inherit' });

  console.log('[Icons] ✅ Icon generation complete.');
  console.log('[Icons] Android icons → android/app/src/main/res/mipmap-*/');
  console.log('[Icons] PWA icons    → public/icons/');
  console.log('[Icons] Rebuild the APK to apply the new icons.');
} catch (error) {
  console.warn('[Icons] ⚠️ Icon generation skipped or failed (non-blocking for production web deployment):', error.message);
  console.warn('[Icons] Make sure @capacitor/assets is installed or is supported in your environment.');
}
