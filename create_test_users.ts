import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = (process.env.COCKROACH_URL || process.env.DATABASE_URL)?.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false }
});

async function createTestUsers() {
  const tanodPass = await bcrypt.hash('tanodtest', 10);
  const residentPass = await bcrypt.hash('residenttest', 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create Tanod
    await client.query(
      "INSERT INTO users (email, password, name, role, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING",
      ['tanodtest@gmail.com', tanodPass, 'Tanod Test', 'tanod', 'verified']
    );
    
    // Create Resident
    await client.query(
      "INSERT INTO users (email, password, name, role, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING",
      ['residenttest@gmail.com', residentPass, 'Resident Test', 'resident', 'pending']
    );
    
    await client.query('COMMIT');
    console.log("Test users created successfully.");
    console.log("  Tanod   → tanodtest@gmail.com / tanodtest");
    console.log("  Resident → residenttest@gmail.com / residenttest");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error:", err);
  } finally {
    client.release();
    process.exit();
  }
}

createTestUsers();
