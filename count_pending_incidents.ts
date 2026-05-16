import { pool } from './src/server/db/index';

async function run() {
  try {
    console.log('Counting pending incidents...');
    const result = await pool.query(`
      SELECT count(*)
      FROM incidents
      WHERE status = 'pending';
    `);
    
    console.log('Pending incidents count:', result.rows[0].count);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
