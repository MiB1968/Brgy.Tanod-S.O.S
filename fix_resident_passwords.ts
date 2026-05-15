import { pool } from './src/server/db/index';
import bcrypt from 'bcryptjs';

async function run() {
  try {
    console.log('Fixing resident passwords...');
    
    const password = 'placeholder_password';
    const hashedPass = await bcrypt.hash(password, 12);
    
    const residents = [
      '60f76295-9e93-4037-8822-b655f771427f', // Resident One
      '099c7a1a-1ae5-46af-96f5-398686a47053'  // Resident Two
    ];

    for (const id of residents) {
      await pool.query(`
        UPDATE users
        SET password = $1
        WHERE id = $2
      `, [hashedPass, id]);
      console.log(`Updated password for user ID: ${id}`);
    }

    console.log('Successfully updated resident passwords.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
