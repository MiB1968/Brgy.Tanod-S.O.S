import { execSync } from 'child_process';

function run(cmd: string) {
  try {
    console.log(`> ${cmd}`);
    const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log(out);
    return out;
  } catch (err: any) {
    console.error(`ERROR running "${cmd}":`, err.message);
    if (err.stdout) console.log('STDOUT:', err.stdout);
    if (err.stderr) console.error('STDERR:', err.stderr);
    throw err;
  }
}

try {
  run('git init');
  run('git remote add origin https://github.com/MiB1968/Brgy.Tanod-S.O.S.git');
  run('git fetch origin');
  run('git branch -r');
} catch (e) {
  console.error('Migration initialization step failed');
}
