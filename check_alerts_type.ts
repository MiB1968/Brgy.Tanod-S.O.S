import { pool } from './src/server/db/index';

async function checkTableType() {
  try {
    const res = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_name = 'alerts';
    `);
    console.log("Table 'alerts' info:", res.rows);
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}
checkTableType();
