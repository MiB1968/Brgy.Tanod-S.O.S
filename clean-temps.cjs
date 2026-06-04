const fs = require('fs');
const path = require('path');

const filesToDelete = [
  'git-checkout-and-verify.cjs',
  'git-pull-jules.cjs',
  'git-status.cjs',
  'log-git.cjs',
  'rebuild-git.cjs',
  'resolve-git.cjs',
  'sync-diff.cjs',
  'sync-git.cjs',
  'sync-merge.cjs',
  'sync-rebase.cjs',
  'test-git.ts',
  'src/server/db/migrations/0005_graceful_callisto.sql',
  'src/server/db/migrations/0006_performance_and_security.sql',
  'src/server/lib/logger.ts'
];

filesToDelete.forEach(f => {
  const p = path.resolve(__dirname, f);
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
      console.log(`Deleted: ${f}`);
    } catch (e) {
      console.error(`Failed to delete ${f}:`, e.message);
    }
  }
});
