const { spawn } = require('child_process');
const fs = require('fs');

console.log('Starting server...');
const child = spawn('node', ['dist/server.cjs']);
const out = fs.createWriteStream('server.log');
child.stdout.pipe(out);
child.stderr.pipe(out);

child.on('error', (err) => {
  console.log('Failed to start process.', err);
});

setTimeout(() => {
  console.log('5 seconds passed. Killing server...');
  child.kill();
}, 5000);
