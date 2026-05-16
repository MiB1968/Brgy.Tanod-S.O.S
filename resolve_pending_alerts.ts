import { pool } from './src/server/db/index';

async function run() {
  try {
    console.log('Resolving pending alerts...');
    const result = await pool.query(`
      UPDATE alerts 
      SET status = 'resolved', updated_at = now()
      WHERE status = 'pending';
    `);
    
    console.log('Updated rows:', result.rowCount);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
run();
