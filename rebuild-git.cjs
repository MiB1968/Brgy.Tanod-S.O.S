const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, ignoreError = false) {
  try {
    console.log(`> ${cmd}`);
    const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log(out);
    return out;
  } catch (err) {
    console.error(`ERROR running "${cmd}":`, err.message);
    if (err.stdout) console.log('STDOUT:', err.stdout);
    if (err.stderr) console.error('STDERR:', err.stderr);
    if (!ignoreError) throw err;
    return null;
  }
}

try {
  // If .git exists, let's delete it so we start perfectly fresh and avoid any packfile index corruption
  const gitDir = path.resolve(__dirname, '.git');
  if (fs.existsSync(gitDir)) {
    console.log('Removing corrupted .git folder...');
    fs.rmSync(gitDir, { recursive: true, force: true });
  }

  run('git init');
  run('git config user.name "AI Agent"');
  run('git config user.email "agent@aistudio"');
  run('git remote add origin https://github.com/MiB1968/Brgy.Tanod-S.O.S.git');
  
  console.log('Fetching origin...');
  run('git fetch origin');
  
  console.log('Listing remote branches:');
  run('git branch -r');
} catch (e) {
  console.error('Clean fetch failed:', e);
}
