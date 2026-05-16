import { pool } from './src/server/db/index';

async function run() {
  try {
    console.log('Checking pending incidents in ALL tables...');
    
    const alerts = await pool.query(`SELECT count(*) FROM alerts WHERE status = 'pending';`);
    console.log('Pending in "alerts":', alerts.rows[0].count);
    
    const incidents = await pool.query(`SELECT count(*) FROM incidents WHERE status = 'pending';`);
    console.log('Pending in "incidents":', incidents.rows[0].count);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
run();
