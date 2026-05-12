import { pool } from '../db/index';
import { config } from '../config/index';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

export async function initDb(retries = 3) {
  for (let i = 0; i < retries; i++) {
    let client;
    try {
      logger.info(`DB_INIT: Attempting to connect (Attempt ${i + 1}/${retries})...`);
      client = await pool.connect();
      logger.info("DB_INIT: Auth Successful.");

      // Bootstrap Admin - ONLY check if we actually need an admin account
      const adminResult = await client.query("SELECT * FROM users WHERE role = 'admin' OR role = 'superadmin'");
      
      if (adminResult.rows.length === 0) {
        // No admin exists, require the bootstrap keys
        const { email: adminEmail, password: adminPassword } = config.adminBootstrap;
        if (!adminEmail || !adminPassword) {
          throw new Error('ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be set in .env to create the first admin account.');
        }

        const hashedPass = await bcrypt.hash(adminPassword, 10);
        await client.query(
          "INSERT INTO users (email, password, name, role, status) VALUES ($1, $2, $3, $4, $5)",
          [adminEmail, hashedPass, 'Super Admin', 'admin', 'verified']
        );
        console.log(`Successfully bootstrapped first admin: ${adminEmail}`);
      }

      // Initialize Siren config
      await client.query(`
        INSERT INTO system_config (key, data) 
        VALUES ('siren', '{"sirenActive": false}') 
        ON CONFLICT DO NOTHING
      `);

      logger.info("DB_INIT: Schema synchronized.");
      return;

    } catch (err: any) {
      logger.error(`DB_INIT_ERROR (Attempt ${i + 1}): ${err.message}`);
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 2000));
      } else {
        throw err;
      }
    } finally {
      if (client) client.release();
    }
  }
}
