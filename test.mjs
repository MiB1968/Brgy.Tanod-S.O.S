import { spawn } from 'child_process';

console.log('Spawning server...');
const child = spawn('node', ['dist/server.cjs']);

child.stdout.on('data', data => {
  process.stdout.write('[STDOUT] ' + data);
  if (data.toString().includes('BATTLE-READY')) {
     console.log('Server successfully started! Killing it now.');
     child.kill();
     process.exit(0);
  }
});

child.stderr.on('data', data => {
  process.stdout.write('[STDERR] ' + data);
});

child.on('close', code => {
  console.log('Child process exited with code ' + code);
  process.exit(code);
});
