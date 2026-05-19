import { pool } from './src/server/db/index.js';

async function migrate() {
  try {
    await pool.query('ALTER TABLE "system_broadcasts" ADD COLUMN "incident_id" uuid;');
    console.log("Migration 0004 applied manually (system_broadcasts).");
  } catch(e) {
    console.log("Error migrating (might already exist):", e.message);
  }

  // Check audit_logs just in case
  try {
    await pool.query('ALTER TABLE "audit_logs" ADD COLUMN "incident_id" uuid;');
    console.log("Migration for audit_logs applied.");
  } catch(e) {
    console.log("Error migrating audit_logs (might already exist):", e.message);
  }

  process.exit(0);
}

migrate();
