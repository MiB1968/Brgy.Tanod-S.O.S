import { pool } from './src/server/db/index';

async function run() {
  try {
    console.log('Listing tables...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    
    console.log(result.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
