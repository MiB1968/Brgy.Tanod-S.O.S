import { pool } from "./src/server/db/index";

async function run() {
  try {
    console.log("Querying residents...");
    const res1 = await pool.query("SELECT u.id, u.email, u.name, u.role, u.status, r.* FROM users u JOIN residents r ON u.id = r.id WHERE u.role = 'resident'");
    console.log("Residents rows:", res1.rows.length);

    console.log("Querying incidents...");
    const res2 = await pool.query("SELECT * FROM incidents ORDER BY timestamp DESC LIMIT 100");
    console.log("Incidents rows:", res2.rows.length);

    console.log("Querying patrols...");
    const res3 = await pool.query("SELECT * FROM patrols");
    console.log("Patrols rows:", res3.rows.length);

    console.log("Querying alerts...");
    const res4 = await pool.query("SELECT a.*, u.name as \"residentName\" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id ORDER BY a.created_at DESC LIMIT 100");
    console.log("Alerts rows:", res4.rows.length);

    console.log("Queries successful!");
  } catch (err: any) {
    console.error("Query failed with error:", err);
  } finally {
    process.exit(0);
  }
}

run();
