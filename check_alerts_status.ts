import { pool } from './src/server/db/index';

async function run() {
  try {
    console.log('Checking active/responding alerts...');
    
    const alerts = await pool.query(`SELECT status, count(*) FROM alerts GROUP BY status;`);
    console.table(alerts.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
run();
