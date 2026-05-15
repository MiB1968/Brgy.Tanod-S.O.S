import { pool } from './src/server/db/index';

async function run() {
  try {
    console.log('Testing DB connection...');
    await pool.query('SELECT 1');
    console.log('DB connection successful');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
