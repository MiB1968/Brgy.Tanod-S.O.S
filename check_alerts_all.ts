import { pool } from './src/server/db/index';

async function checkTableDefinition() {
  try {
    const res = await pool.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'alerts';
    `);
    console.log("Table 'alerts' columns:", res.rows);
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}
checkTableDefinition();
