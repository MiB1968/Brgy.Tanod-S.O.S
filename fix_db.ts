import { pool } from './src/server/db/index';

async function run() {
  try {
    console.log('Adding column...');
    await pool.query('ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;');
    console.log('Column added successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
