import { execSync } from 'child_process';
try {
  const remotes = execSync('git remote -v', { encoding: 'utf8' });
  console.log('REMOTES:', remotes);
  const status = execSync('git status', { encoding: 'utf8' });
  console.log('STATUS:', status);
  const branch = execSync('git branch -a', { encoding: 'utf8' });
  console.log('BRANCHES:', branch);
} catch (err: any) {
  console.error('ERROR running git commands:', err?.message || err);
  if (err?.stdout) console.log('STDOUT:', err.stdout.toString());
  if (err?.stderr) console.log('STDERR:', err.stderr.toString());
}
