const { execSync } = require('child_process');
try {
  const remotes = execSync('git remote -v', { encoding: 'utf8' });
  console.log('REMOTES:', remotes);
  const status = execSync('git status', { encoding: 'utf8' });
  console.log('STATUS:', status);
  const branches = execSync('git branch -a', { encoding: 'utf8' });
  console.log('BRANCHES:', branches);
} catch (e) {
  console.error('Git check failed:', e.message);
}
