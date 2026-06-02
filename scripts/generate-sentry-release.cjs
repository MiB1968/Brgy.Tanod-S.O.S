const { execSync } = require('child_process');
const fs = require('fs');

try {
  let commitHash = 'unknown';
  let branch = 'unknown';
  try {
    commitHash = execSync('git rev-parse HEAD').toString().trim();
    branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  } catch (e) {
    console.warn('[Sentry] Not a git repository, using fallback.');
  }
  
  const shortHash = commitHash === 'unknown' ? 'unknown' : commitHash.substring(0, 7);
  const date = new Date().toISOString();

  const releaseInfo = {
    release: `brgy-tanod-sos@${shortHash}`,
    commit: commitHash,
    branch,
    date,
  };

  fs.writeFileSync('src/release.json', JSON.stringify(releaseInfo, null, 2));
  console.log(`[Sentry] Release generated: ${releaseInfo.release}`);
} catch (error) {
  console.error('[Sentry] Failed to generate release info:', error.message);
  // Ensure release.json exists even on failure
  fs.writeFileSync('src/release.json', JSON.stringify({ release: 'unknown' }, null, 2));
}
