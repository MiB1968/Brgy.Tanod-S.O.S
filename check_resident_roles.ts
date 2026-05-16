import { pool } from './src/server/db/index';

async function run() {
  try {
    const res = await pool.query("SELECT id, name, role, status FROM users WHERE email LIKE 'resident%'");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
