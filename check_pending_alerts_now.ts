import { pool } from './src/server/db/index';

async function run() {
  try {
    console.log('Checking pending alerts again...');
    
    const alerts = await pool.query(`SELECT * FROM alerts WHERE status = 'pending';`);
    console.log('Pending in "alerts" (number of rows):', alerts.rows.length);
    if (alerts.rows.length > 0) {
        console.log('Ids:', alerts.rows.map(a => a.id));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
run();
