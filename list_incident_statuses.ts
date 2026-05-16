import { pool } from './src/server/db/index';

async function run() {
  try {
    console.log('Checking incident statuses...');
    const result = await pool.query(`
      SELECT DISTINCT status
      FROM incidents;
    `);
    
    console.log('Statuses:', result.rows.map(r => r.status));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
