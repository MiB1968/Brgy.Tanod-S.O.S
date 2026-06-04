const { execSync } = require('child_process');

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
  // Let's checkout origin/audit/security-hardening-standardization-7564050883625895729 to a local branch
  run('git checkout -f -b jules-security-branch origin/audit/security-hardening-standardization-7564050883625895729');
  run('git log -n 5 --oneline');
} catch (e) {
  console.error('Failed to checkout branch', e);
}
