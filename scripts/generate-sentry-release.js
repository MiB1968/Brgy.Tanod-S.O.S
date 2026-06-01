const { execSync } = require('child_process');
const fs = require('fs');

try {
  const commitHash = execSync('git rev-parse HEAD').toString().trim();
  const shortHash = commitHash.substring(0, 7);
  const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
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
}
