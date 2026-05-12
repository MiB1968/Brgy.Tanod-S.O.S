import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = (process.env.COCKROACH_URL || process.env.DATABASE_URL)?.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false }
});

async function fixUserStatus() {
  const client = await pool.connect();
  try {
    await client.query("UPDATE users SET status = 'approved' WHERE role = 'tanod'");
    console.log("Updated Tanod status to 'approved'");
    
    // Also add a few more tanods
    const names = ['Officer Ricardo', 'Officer Juan', 'Officer Maria'];
    for (const name of names) {
        const email = `${name.toLowerCase().replace(' ', '.')}.tanod@gmail.com`;
        await client.query(
            "INSERT INTO users (email, password, name, role, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING",
            [email, 'tanodtest', name, 'tanod', 'approved']
        );
    }
    console.log("Added more test Tanods.");
  } finally {
    client.release();
    process.exit();
  }
}

fixUserStatus();
