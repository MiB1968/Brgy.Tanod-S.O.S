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
  console.error(`[Icons] ERROR: Icon source not found at ${ICON_SOURCE}`);
  console.error('[Icons] Place a 1024x1024px PNG at assets/icon.png and retry.');
  process.exit(1);
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
  console.error('[Icons] ❌ Icon generation failed:', error.message);
  console.error('[Icons] Make sure @capacitor/assets is installed:');
  console.error('         npm install --save-dev @capacitor/assets');
  process.exit(1);
}
