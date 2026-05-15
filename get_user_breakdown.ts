import { pool } from './src/server/db/index';

async function run() {
  try {
    console.log('Fetching user breakdown...');
    const result = await pool.query(`
      SELECT role, status, COUNT(*) as count
      FROM users
      GROUP BY role, status;
    `);
    
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
