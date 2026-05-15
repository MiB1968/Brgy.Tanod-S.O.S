import { pool } from './src/server/db/index';
import { v4 as uuidv4 } from 'uuid';

async function run() {
  try {
    console.log('Creating 2 verified resident accounts...');
    
    const residents = [
      { name: 'Resident One', email: 'resident1@example.com' },
      { name: 'Resident Two', email: 'resident2@example.com' }
    ];

    for (const res of residents) {
      const id = uuidv4();
      // Using a placeholder password, normally this should be hashed
      await pool.query(`
        INSERT INTO users (id, name, email, role, status, password)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [id, res.name, res.email, 'resident', 'verified', 'placeholder_password']);
      console.log(`Created ${res.name} with ID: ${id}`);
    }

    console.log('Successfully created both resident accounts.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
