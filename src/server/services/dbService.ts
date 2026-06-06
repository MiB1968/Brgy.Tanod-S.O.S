import { pool } from '../db/index';
import { config } from '../config/index';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

export async function initDb(retries = 3) {
  if (!config.databaseUrl) {
    logger.warn('DB_INIT: Skipping SQL database initialization because DATABASE_URL is not set.');
    return;
  }

  for (let i = 0; i < retries; i++) {
    let client;
    try {
      logger.info(`DB_INIT: Attempting to connect (Attempt ${i + 1}/${retries})...`);
      client = await pool.connect();
      logger.info("DB_INIT: Auth Successful.");

      // Bootstrap Admin - ONLY check if we actually need an admin account
      const adminResult = await client.query("SELECT * FROM users WHERE role = 'admin' OR role = 'super_admin'");
      
      if (adminResult.rows.length === 0) {
        // No admin exists, require the bootstrap keys
        const { email: adminEmail, password: adminPassword } = config.adminBootstrap;
        if (!adminEmail || !adminPassword) {
          logger.warn('ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD not set in .env. Skipping initial admin creation.');
        } else {
          const hashedPass = await bcrypt.hash(adminPassword, 10);
          await client.query(
            "INSERT INTO users (email, password, name, role, status) VALUES ($1, $2, $3, $4, $5)",
            [adminEmail, hashedPass, 'Super Admin', 'admin', 'verified']
          );
          console.log(`Successfully bootstrapped first admin: ${adminEmail}`);
        }
      }

      // Initialize Siren config
      await client.query(`
        INSERT INTO system_config (key, data) 
        VALUES ('siren', '{"sirenActive": false}') 
        ON CONFLICT DO NOTHING
      `);

      // Initialize Barangay config (default geofence)
      await client.query(`
        INSERT INTO system_config (key, data) 
        VALUES ('barangay_default', '{"center": {"lat": 14.5995, "lng": 120.9842}, "radiusKm": 10, "name": "Default Barangay"}') 
        ON CONFLICT DO NOTHING
      `);

      // Apply necessary schema migrations manually
      const runQuerySilently = async (sql: string, desc: string) => {
        try {
          await client.query(sql);
          logger.info(`DB_INIT: ${desc}`);
        } catch (e: any) {
          // 42701: duplicate_column
          // 42710: duplicate_object (duplicate constraint / index)
          // 42P16: duplicate_table / constraint
          if (e.code === '42701' || e.code === '42710' || e.code === '42P16') {
            // Already applied, skip silently
          } else {
            logger.warn(`DB_INIT: Migration warning for "${desc}": ${e.message} (code: ${e.code})`);
          }
        }
      };

      await runQuerySilently("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1", "Added token_version to users");
      await runQuerySilently("ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128)", "Added firebase_uid to users");
      await runQuerySilently("CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid)", "Created idx_users_firebase_uid index");
      await runQuerySilently("ALTER TABLE users ADD COLUMN barangay_id TEXT DEFAULT 'default'", "Added barangay_id to users");
      await runQuerySilently("ALTER TABLE users ADD CONSTRAINT check_token_version CHECK (token_version > 0)", "Added check_token_version to users");
      await runQuerySilently("CREATE INDEX idx_users_token_version ON users(id, token_version)", "Created idx_users_token_version index");

      // Residents migrations
      await runQuerySilently("ALTER TABLE residents ADD COLUMN is_outside_barangay BOOLEAN DEFAULT false", "Added is_outside_barangay to residents");
      await runQuerySilently("ALTER TABLE residents ADD COLUMN last_location_check TIMESTAMP WITH TIME ZONE", "Added last_location_check to residents");

      // Barangay boundaries migration
      await runQuerySilently(`
        CREATE TABLE IF NOT EXISTS barangay_boundaries (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100),
          boundary_geojson JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `, "Created barangay_boundaries table");

      // Admin Audit Logs migrations
      await runQuerySilently("ALTER TABLE audit_logs ADD COLUMN admin_id UUID REFERENCES users(id)", "Added admin_id to audit_logs");
      await runQuerySilently("ALTER TABLE audit_logs ADD COLUMN action VARCHAR(100)", "Added action to audit_logs");
      await runQuerySilently("ALTER TABLE audit_logs ADD COLUMN target_table VARCHAR(50)", "Added target_table to audit_logs");
      await runQuerySilently("ALTER TABLE audit_logs ADD COLUMN target_id VARCHAR(100)", "Added target_id to audit_logs");
      await runQuerySilently("ALTER TABLE audit_logs ADD COLUMN details JSONB", "Added details to audit_logs");
      await runQuerySilently("CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id)", "Created idx_audit_logs_admin_id");
      await runQuerySilently("CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)", "Created idx_audit_logs_action");
      await runQuerySilently("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)", "Created idx_audit_logs_created_at");

      // Alerts migrations
      await runQuerySilently("ALTER TABLE alerts ADD COLUMN barangay_id TEXT DEFAULT 'default'", "Added barangay_id to alerts");
      await runQuerySilently("ALTER TABLE alerts ADD COLUMN assigned_to UUID", "Added assigned_to to alerts");
      await runQuerySilently("ALTER TABLE alerts ADD COLUMN assigned_to_name TEXT", "Added assigned_to_name to alerts");
      await runQuerySilently("ALTER TABLE alerts ADD COLUMN responded_by UUID", "Added responded_by to alerts");
      await runQuerySilently("ALTER TABLE alerts ADD COLUMN responded_by_name TEXT", "Added responded_by_name to alerts");
      await runQuerySilently("ALTER TABLE alerts ADD COLUMN responded_at TIMESTAMP WITH TIME ZONE", "Added responded_at to alerts");

      // Incidents migrations
      await runQuerySilently("ALTER TABLE incidents ADD COLUMN barangay_id TEXT DEFAULT 'default'", "Added barangay_id to incidents");
      await runQuerySilently("ALTER TABLE incidents ADD COLUMN assigned_to UUID", "Added assigned_to to incidents");
      await runQuerySilently("ALTER TABLE incidents ADD COLUMN assigned_to_name TEXT", "Added assigned_to_name to incidents");
      await runQuerySilently("ALTER TABLE incidents ADD COLUMN responded_by UUID", "Added responded_by to incidents");
      await runQuerySilently("ALTER TABLE incidents ADD COLUMN responded_by_name TEXT", "Added responded_by_name to incidents");
      await runQuerySilently("ALTER TABLE incidents ADD COLUMN responded_at TIMESTAMP WITH TIME ZONE", "Added responded_at to incidents");
      await runQuerySilently("ALTER TABLE incidents ADD COLUMN resolution_notes TEXT", "Added resolution_notes to incidents");
      await runQuerySilently("ALTER TABLE incidents ADD COLUMN responder_notes TEXT", "Added responder_notes to incidents");

      // system_broadcasts migrations (0004_mature_green_goblin.sql)
      await runQuerySilently("ALTER TABLE system_broadcasts ALTER COLUMN isactive SET DEFAULT false", "Set system_broadcasts.isactive default false");
      await runQuerySilently("ALTER TABLE system_broadcasts ADD COLUMN incident_id uuid", "Added incident_id to system_broadcasts");
      await runQuerySilently("ALTER TABLE system_broadcasts ADD COLUMN approval_status text DEFAULT 'pending'", "Added approval_status to system_broadcasts");
      await runQuerySilently("ALTER TABLE system_broadcasts ADD COLUMN ai_recommendation jsonb", "Added ai_recommendation to system_broadcasts");
      await runQuerySilently(`
        ALTER TABLE system_broadcasts 
        ADD CONSTRAINT system_broadcasts_incident_id_alerts_id_fk 
        FOREIGN KEY (incident_id) REFERENCES alerts(id) ON DELETE NO ACTION ON UPDATE NO ACTION
      `, "Added foreign key constraint system_broadcasts_incident_id_alerts_id_fk");

      // Convert alerts.responder_recommendations to jsonb (0003_tiresome_bullseye.sql)
      await runQuerySilently(`
        ALTER TABLE alerts 
        ALTER COLUMN responder_recommendations SET DATA TYPE jsonb USING responder_recommendations::jsonb
      `, "Converted alerts.responder_recommendations to JSONB");

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
