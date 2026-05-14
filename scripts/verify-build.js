import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../dist');

console.log('🔍 Build Verification Starting...');

const requiredFiles = [
  'index.html',
  'server.js',
  'assets'
];

let success = true;

requiredFiles.forEach(file => {
  const fullPath = path.join(distPath, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ Found: ${file}`);
  } else {
    console.error(`❌ MISSING: ${file}`);
    success = false;
  }
});

if (!success) {
  console.error('🚨 BUILD FAILED VERIFICATION - Artifacts incomplete');
  process.exit(1);
} else {
  console.log('🎉 BUILD VERIFICATION PASSED - Ready for deployment');
}
