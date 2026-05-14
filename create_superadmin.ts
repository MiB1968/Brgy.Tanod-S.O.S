import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = (process.env.COCKROACH_URL || process.env.DATABASE_URL)?.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false }
});

async function createSuperAdmin() {
  const password = await bcrypt.hash('superadmintest', 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create Super Admin
    await client.query(
      "INSERT INTO users (email, password, name, role, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET role = 'superadmin', status = 'verified'",
      ['superadmintest@gmail.com', password, 'Super Admin Test', 'superadmin', 'verified']
    );
    
    await client.query('COMMIT');
    console.log("Super admin account created/updated successfully.");
    console.log("  Super Admin → superadmintest@gmail.com / superadmintest");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error:", err);
  } finally {
    client.release();
    process.exit();
  }
}

createSuperAdmin();
