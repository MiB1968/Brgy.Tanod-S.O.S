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
  // Let's checkout our standard remote branch onto a branch named local-jules-update
  run('git checkout -f -b local-jules-update origin/audit/security-hardening-standardization-7564050883625895729');
  
  // Let's see the commit details to be 100% sure we have checked out the correct branch
  run('git log -n 3 --oneline');
  run('git status');
} catch (e) {
  console.error('Checkout failed', e);
}
