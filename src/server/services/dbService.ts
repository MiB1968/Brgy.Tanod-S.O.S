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
      
      // Syncing Schema
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'resident',
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT now(),
          last_active TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS residents (
          id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          name TEXT,
          phone TEXT,
          address TEXT,
          house_number TEXT,
          household_size INT DEFAULT 1,
          blood_type TEXT,
          medical_conditions TEXT[],
          emergency_contact_name TEXT,
          emergency_contact_phone TEXT,
          gps_lat FLOAT,
          gps_lng FLOAT,
          status TEXT DEFAULT 'pending',
          is_verified BOOLEAN DEFAULT false,
          verification_date TIMESTAMPTZ
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          resident_id UUID REFERENCES users(id),
          type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          location JSONB NOT NULL,
          description TEXT,
          severity_score INT,
          ai_analysis JSONB,
          assigned_to UUID,
          assigned_to_name TEXT,
          responded_by UUID,
          responded_by_name TEXT,
          responded_at TIMESTAMPTZ,
          resolution_notes TEXT,
          responder_notes TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          resolved_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_alerts_resident_id ON alerts(resident_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
        CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS patrols (
          tanod_id UUID PRIMARY KEY REFERENCES users(id),
          tanod_name TEXT,
          is_active BOOLEAN DEFAULT false,
          location JSONB,
          status TEXT,
          last_ping TIMESTAMPTZ DEFAULT now()
        );
      `);

      // Bootstrap Admin
      const { email: adminEmail, password: adminPassword } = config.adminBootstrap;
      
      if (!adminEmail || !adminPassword) {
        throw new Error('ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be set in .env before starting the server.');
      }
      const adminBootEmail = adminEmail;
      const adminBootPass = adminPassword;

      const adminResult = await client.query("SELECT * FROM users WHERE email = $1", [adminBootEmail]);
      if (adminResult.rows.length === 0) {
        const hashedPass = await bcrypt.hash(adminBootPass, 10);
        await client.query(
          "INSERT INTO users (email, password, name, role, status) VALUES ($1, $2, $3, $4, $5)",
          [adminBootEmail, hashedPass, 'Super Admin', 'admin', 'verified']
        );
        console.log(`Successfully bootstrapped admin: ${adminBootEmail}`);
      }

      await client.query(`
        CREATE TABLE IF NOT EXISTS alert_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
          sender_id UUID REFERENCES users(id),
          sender_name TEXT,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'text',
          timestamp TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_alert_messages_alert_id ON alert_messages(alert_id);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS system_config (
          key TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS system_broadcasts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          message TEXT NOT NULL,
          timestamp TIMESTAMPTZ DEFAULT now(),
          isactive BOOLEAN DEFAULT true,
          admin_id UUID,
          admin_name TEXT,
          type TEXT
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS witness_invites (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
          witness_user_id UUID REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'pending',
          timestamp TIMESTAMPTZ DEFAULT now()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS shifts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tanod_id UUID REFERENCES users(id),
          tanod_name TEXT,
          start_time TIMESTAMPTZ,
          end_time TIMESTAMPTZ,
          sector TEXT,
          status TEXT DEFAULT 'scheduled',
          tanod_response TEXT DEFAULT 'pending',
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          incident_id UUID,
          type TEXT,
          status TEXT,
          citizen_id UUID,
          tanod_assigned TEXT,
          location_lat FLOAT,
          location_lng FLOAT,
          created_at TIMESTAMPTZ DEFAULT now(),
          notes TEXT
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_log_archives (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_date TEXT NOT NULL,
          archived_at TIMESTAMPTZ DEFAULT now(),
          archived_by TEXT,
          log_count INT DEFAULT 0,
          total_incidents INT DEFAULT 0,
          resolved_count INT DEFAULT 0,
          unresolved_count INT DEFAULT 0,
          log_entries JSONB DEFAULT '[]',
          notes TEXT
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS tanod_activity_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tanod_id UUID REFERENCES users(id),
          tanod_name TEXT,
          type TEXT,
          timestamp TIMESTAMPTZ DEFAULT now(),
          details TEXT,
          location JSONB
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS incidents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          alert_id UUID REFERENCES alerts(id),
          tanod_id UUID REFERENCES users(id),
          tanod_name TEXT,
          timestamp TIMESTAMPTZ,
          type TEXT,
          location TEXT,
          gps_location JSONB,
          description TEXT,
          persons_involved TEXT,
          actions_taken TEXT,
          status TEXT,
          assigned_to UUID,
          assigned_to_name TEXT,
          responded_by UUID,
          responded_by_name TEXT,
          responded_at TIMESTAMPTZ,
          resolution_notes TEXT,
          responder_notes TEXT
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS patrol_sessions (
          id TEXT PRIMARY KEY,
          tanod_id UUID REFERENCES users(id),
          tanod_name TEXT,
          start_time TIMESTAMPTZ DEFAULT now(),
          end_time TIMESTAMPTZ,
          route JSONB DEFAULT '[]'
        );
      `);

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
