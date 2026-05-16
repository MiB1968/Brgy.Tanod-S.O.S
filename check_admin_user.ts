import { pool } from './src/server/db/index';

async function run() {
  try {
    const res = await pool.query("SELECT * FROM users WHERE email = 'rubenlleg12@gmail.com'");
    console.log(res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
