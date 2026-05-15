import { pool } from './src/server/db/index';

async function run() {
  try {
    console.log('Testing INSERT query...');
    await pool.query(`
      INSERT INTO incidents (alert_id, tanod_id, tanod_name, citizen_name, timestamp, type, location, gps_location, description, persons_involved, actions_taken, status, responded_at, resolved_at, admin_on_duty)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      null, '00000000-0000-0000-0000-000000000000', 'Test', 'Test', new Date().toISOString(), 'FIRE', 'Location', null, 'Test', null, null, 'pending', null, new Date().toISOString(), null
    ]);
    console.log('Insert successful!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
