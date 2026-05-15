import { pool } from './src/server/db/index';

async function run() {
  try {
    console.log('Checking incidents table...');
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'incidents';
    `);
    console.log('Columns:', res.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
