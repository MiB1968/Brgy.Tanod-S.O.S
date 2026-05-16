import { pool } from './src/server/db/index';

async function run() {
  try {
    const res = await pool.query("SELECT email, role FROM users WHERE email = 'resident1@example.com'");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
