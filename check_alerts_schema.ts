import { pool } from './src/server/db/index';

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'alerts';
    `);
    console.log("Columns in 'alerts' table:", res.rows);
    process.exit(0);
  } catch (err) {
    console.error("Schema check failed:", err);
    process.exit(1);
  }
}
checkSchema();
