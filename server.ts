import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import * as http from "http";
import path from "path";
import { fileURLToPath } from 'url';
import { z } from "zod";
import pg from "pg";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Pool } = pg;
const DATABASE_URL = (process.env.COCKROACH_URL || process.env.DATABASE_URL)?.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.");
  process.exit(1);
}

// Database Pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false }
});

interface AuthRequest extends express.Request {
  user?: any;
}

// --- Auth Middleware ---
function authenticate(req: AuthRequest, res: any, next: any) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.log("AUTHENTICATE: No token found. Cookies:", req.cookies);
    return res.status(401).json({ error: "Auth required" });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    console.error("AUTHENTICATE: Invalid token:", err);
    res.status(401).json({ error: "Invalid token" });
  }
}

async function initDb(retries = 3) {
  for (let i = 0; i < retries; i++) {
    let client;
    try {
      console.log(`DB_INIT: Attempting to connect (Attempt ${i + 1}/${retries})...`);
      if (!DATABASE_URL) {
        console.warn("DB_INIT: DATABASE_URL not found. Skipping.");
        return;
      }

      // Diagnostic
      try {
        const url = new URL(DATABASE_URL);
        console.log(`DB_INIT: Protocol: ${url.protocol}`);
        console.log(`DB_INIT: Host: "${url.hostname}"`);
        console.log(`DB_INIT: Port: ${url.port}`);
      } catch (e: any) {
        console.log("DB_INIT: URL Error:", e.message);
      }

      client = await pool.connect();
      console.log("DB_INIT: Auth Successful.");
      
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
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS residents (
          id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
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
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          resolved_at TIMESTAMPTZ
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS patrols (
          tanod_id UUID PRIMARY KEY REFERENCES users(id),
          is_active BOOLEAN DEFAULT false,
          location JSONB,
          last_ping TIMESTAMPTZ DEFAULT now()
        );
      `);

      // Bootstrap Admin
      const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
      const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

      if (!adminEmail || !adminPassword) {
        console.warn("WARN: ADMIN_BOOTSTRAP_EMAIL or ADMIN_BOOTSTRAP_PASSWORD not set. Skipping admin bootstrap.");
      } else {
        const adminResult = await client.query("SELECT * FROM users WHERE email = $1", [adminEmail]);
        if (adminResult.rows.length === 0) {
          const hashedPass = await bcrypt.hash(adminPassword, 10);
          await client.query(
            "INSERT INTO users (email, password, name, role, status) VALUES ($1, $2, $3, $4, $5)",
            [adminEmail, hashedPass, 'Ruben (SuperAdmin)', 'admin', 'verified']
          );
        }
      }

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
          isActive BOOLEAN DEFAULT true
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
          gps_location JSONB,
          description TEXT,
          status TEXT
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

      await client.query(`
        CREATE TABLE IF NOT EXISTS witness_invites (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
          invited_by UUID REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      // Initialize Siren config
      await client.query(`
        INSERT INTO system_config (key, data) 
        VALUES ('siren', '{"sirenActive": false}') 
        ON CONFLICT DO NOTHING
      `);

      console.log("DB_INIT: Schema synchronized.");
      return; // SUCCESS - Exit the retry loop

    } catch (err: any) {
      if (err.message.includes("EAI_AGAIN") || err.message.includes("ENOTFOUND")) {
        console.error(`DB_DNS_ERROR (Attempt ${i + 1}): Host not found.`);
      } else if (err.message.includes("password authentication failed")) {
        console.error(`DB_AUTH_ERROR (Attempt ${i + 1}): Check password.`);
        return; // Don't retry if auth fails
      } else {
        console.error(`DB_INIT_ERROR (Attempt ${i + 1}):`, err.message);
      }
      
      if (i < retries - 1) {
        console.log(`DB_INIT: Retrying in 2 seconds...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    } finally {
      if (client) client.release();
    }
  }
}

async function startServer() {
  try {
    await initDb();
  } catch (err) {
    console.error("SERVER_START_DB_ERROR:", err);
  }

  const app = express();
  const PORT = 3000;

  // IMPORTANT: Set trust proxy for rate limiting behind load balancers
  app.set('trust proxy', 1);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" }
  });

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false,
  }));
  app.use(express.json());
  app.use(cookieParser());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 1000, // Increased
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }, 
  });
  app.use("/api/", limiter);

  // --- Sync API (Mock Firestore to Postgres) ---
  app.get("/api/sync", authenticate, async (req: AuthRequest, res: any) => {
    const { path: fullPath } = req.query;
    if (!fullPath) return res.status(400).json({ error: "Path required" });

    const fullPathStr = decodeURIComponent(fullPath as string);
    const [basePath, searchParams] = fullPathStr.split('?');
    const parts = basePath.split('/');
    const collection = parts[0];
    const id = parts[1];

    try {
      console.log(`SYNC_API: Request collection=${collection}, id=${id}, searchParams=${searchParams}`);

      if (collection === 'system' && id === 'siren') {
        const result = await pool.query("SELECT data FROM system_config WHERE key = 'siren'");
        return res.json(result.rows[0]?.data || { sirenActive: false });
      }

      if (collection === 'alerts' || collection === 'active_alerts') {
        if (id) {
          const result = await pool.query("SELECT * FROM alerts WHERE id = $1", [id]);
          const alert = result.rows[0];
          if (!alert) return res.status(404).json({ error: "Not found" });
          return res.json({
            ...alert,
            location: typeof alert.location === 'string' ? JSON.parse(alert.location) : alert.location,
            timestamp: alert.created_at
          });
        } else {
          // Simplified implementation for now if searching is complex
          const query = "SELECT * FROM alerts ORDER BY created_at DESC LIMIT 100";
          console.log(`DB_QUERY: ${query}`);
          const result = await pool.query(query);
          return res.json(result.rows.map(a => ({
            ...a,
            location: typeof a.location === 'string' ? JSON.parse(a.location) : a.location,
            timestamp: a.created_at
          })));
        }
      }

      if (collection === 'incidents') {
        const query = "SELECT * FROM incidents ORDER BY timestamp DESC LIMIT 100";
        console.log(`DB_QUERY: ${query}`);
        const result = await pool.query(query);
        return res.json(result.rows.map(i => ({
            id: i.id,
            ...i
        })));
      }

      if (collection === 'users' || collection === 'residents') {
        if (searchParams && searchParams.includes('role=tanod')) {
            const query = "SELECT id, email, name, role, status FROM users WHERE role = 'tanod'";
            console.log(`DB_QUERY: ${query}`);
            const result = await pool.query(query);
            return res.json(result.rows);
        }
        if (id) {
          const query = "SELECT id, email, name, role, status FROM users WHERE id = $1";
          console.log(`DB_QUERY: ${query}, ID: ${id}`);
          const result = await pool.query(query, [id]);
          return res.json(result.rows[0] || null);
        }
        const query = "SELECT id, email, name, role, status FROM users WHERE role = 'resident'";
        console.log(`DB_QUERY: ${query}`);
        const result = await pool.query(query);
        return res.json(result.rows);
      }

      if (collection === 'patrols') {
        const query = "SELECT * FROM patrols";
        console.log(`DB_QUERY: ${query}`);
        const result = await pool.query(query);
        return res.json(result.rows.map(p => ({
          ...p,
          location: typeof p.location === 'string' ? JSON.parse(p.location) : p.location,
          lastUpdate: p.last_ping
        })));
      }

      if (collection === 'broadcasts' || collection === 'system_broadcasts') {
        const query = "SELECT * FROM system_broadcasts WHERE isactive = true ORDER BY timestamp DESC LIMIT 1";
        console.log(`DB_QUERY: ${query}`);
        const result = await pool.query(query);
        return res.json(result.rows);
      }

      if (collection === 'witness_invites') {
        // For now return empty or handle based on params if needed, but not mapping will cause error
        // Let's return empty array to prevent failure for now if not implemented
        return res.json([]);
      }

      if (collection === 'audit_logs') {
        const query = "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100";
        console.log(`DB_QUERY: ${query}`);
        const result = await pool.query(query);
        return res.json(result.rows);
      }

      if (collection === 'tanod_activity_logs') {
        const query = "SELECT * FROM tanod_activity_logs ORDER BY timestamp DESC LIMIT 100";
        console.log(`DB_QUERY: ${query}`);
        const result = await pool.query(query);
        return res.json(result.rows.map(l => ({
          id: l.id,
          ...l,
          location: typeof l.location === 'string' ? JSON.parse(l.location) : l.location
        })));
      }

      if (collection === 'shifts') {
        return res.json([]);
      }

      if (collection === 'patrol_sessions') {
        const query = "SELECT * FROM patrol_sessions ORDER BY start_time DESC LIMIT 50";
        console.log(`DB_QUERY: ${query}`);
        const result = await pool.query(query);
        return res.json(result.rows.map(s => ({
          id: s.id,
          ...s,
          route: typeof s.route === 'string' ? JSON.parse(s.route) : s.route
        })));
      }

      res.status(404).json({ error: `Path not mapped: ${fullPathStr}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sync", authenticate, async (req: AuthRequest, res: any) => {
    const { path: fullPath, id, data, options } = req.body;
    const parts = (fullPath as string).split('/');
    const collection = parts[0];
    const docId = id || parts[1];

    try {
      if (collection === 'system' && docId === 'siren') {
        await pool.query(
          "INSERT INTO system_config (key, data, updated_at) VALUES ('siren', $1, now()) ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = now()",
          [JSON.stringify(data)]
        );
        io.emit("siren_update", data);
        return res.json({ success: true });
      }

      if (collection === 'patrol_sessions') {
        if (options?.merge) {
          const current = await pool.query("SELECT route FROM patrol_sessions WHERE id = $1", [docId]);
          let newRoute = data.route;
          if (data.route?._type === 'arrayUnion' && current.rows[0]) {
             newRoute = [...(current.rows[0].route || []), ...data.route.elements];
          }
          
          await pool.query(
            "UPDATE patrol_sessions SET route = COALESCE($1, route), end_time = COALESCE($2, end_time) WHERE id = $3",
            [newRoute ? JSON.stringify(newRoute) : null, data.endTime || null, docId]
          );
        } else {
          await pool.query(
            "INSERT INTO patrol_sessions (id, tanod_id, tanod_name, start_time, route) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET route = $5",
            [docId, data.tanodId, data.tanodName, data.startTime, JSON.stringify(data.route || [])]
          );
        }
        return res.json({ success: true, id: docId });
      }

      if (collection === 'audit_logs') {
        await pool.query(
          "INSERT INTO audit_logs (incident_id, type, status, citizen_id, tanod_assigned, location_lat, location_lng, created_at, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [data.incident_id, data.type, data.status, data.citizen_id, data.tanod_assigned, data.location_lat, data.location_lng, data.created_at, data.notes]
        );
        return res.json({ success: true });
      }

      if (collection === 'tanod_activity_logs') {
        await pool.query(
          "INSERT INTO tanod_activity_logs (tanod_id, tanod_name, type, timestamp, details, location) VALUES ($1, $2, $3, $4, $5, $6)",
          [data.tanodId, data.tanodName, data.type, data.timestamp, data.details, JSON.stringify(data.location || null)]
        );
        return res.json({ success: true });
      }

      if (collection === 'users') {
        const result = await pool.query(
          `UPDATE users SET status = $1, last_active = now() WHERE id = $2`,
          [data.status, docId]
        );
        return res.json({ success: true });
      }

      if (collection === 'residents') {
        const ALLOWED_RESIDENT_FIELDS = ['phone', 'address', 'house_number', 'household_size', 'blood_type', 'medical_conditions', 'emergency_contact_name', 'emergency_contact_phone', 'gps_lat', 'gps_lng', 'is_verified', 'verification_date'];
        const safeFields = Object.keys(data).filter(f => ALLOWED_RESIDENT_FIELDS.includes(f));
        if (safeFields.length === 0) return res.status(400).json({ error: "No valid fields to update" });
        const setClause = safeFields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        await pool.query(
          `UPDATE residents SET ${setClause} WHERE id = $1`,
          [docId, ...safeFields.map(f => data[f])]
        );
        return res.json({ success: true });
      }

      if (collection === 'patrols') {
        const ALLOWED_PATROL_FIELDS = ['is_active', 'location'];
        const safeFields = Object.keys(data).filter(f => ALLOWED_PATROL_FIELDS.includes(f));
        if (safeFields.length === 0) return res.status(400).json({ error: "No valid fields to update" });
        const setClause = safeFields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        await pool.query(
          `UPDATE patrols SET ${setClause}, last_ping = now() WHERE tanod_id = $1`,
          [docId, ...safeFields.map(f => data[f])]
        );
        return res.json({ success: true });
      }

      if (collection === 'system_broadcasts' || collection === 'broadcasts') {
        await pool.query(
          "UPDATE system_broadcasts SET isActive = $1 WHERE id = $2",
          [data.isActive, docId]
        );
        return res.json({ success: true });
      }

      if (collection === 'witness_invites') {
        await pool.query(
          "UPDATE witness_invites SET status = $1 WHERE id = $2",
          [data.status, docId]
        );
        return res.json({ success: true });
      }

      if (collection === 'incidents') {
        await pool.query(
          "INSERT INTO incidents (alert_id, tanod_id, tanod_name, timestamp, type, gps_location, description, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          [data.alertId, data.tanodId, data.tanodName, data.timestamp, data.type, JSON.stringify(data.gpsLocation), data.description, data.status]
        );
        return res.json({ success: true });
      }

      if (collection === 'alerts') {
        // Dynamic update query for alerts
        const fields = Object.keys(data);
        const values = Object.values(data);
        
        // Simple sanitization - ensure fields are allowed
        const allowedFields = ['status', 'severity_score', 'ai_analysis', 'resolved_at'];
        const updateFields = fields.filter(f => allowedFields.includes(f));
        
        if (updateFields.length > 0) {
          const setClause = updateFields.map((f, i) => `${f} = $${i + 2}`).join(', ');
          await pool.query(
            `UPDATE alerts SET ${setClause}, updated_at = now() WHERE id = $1`,
            [docId, ...updateFields.map(f => data[f])]
          );
          
          const result = await pool.query("SELECT * FROM alerts WHERE id = $1", [docId]);
          io.emit("alert_update", { type: 'update', alert: result.rows[0] });
        }
        
        return res.json({ success: true });
      }

      res.status(404).json({ error: "Path not mapped" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/sync", authenticate, async (req: AuthRequest, res: any) => {
    const { path: fullPath, id } = req.body;
    if (!fullPath) return res.status(400).json({ error: "Path required" });

    const parts = (fullPath as string).split('/');
    const collection = parts[0];
    const docId = id || parts[1];

    try {
      if (collection === 'alerts' && docId) {
        await pool.query("DELETE FROM alerts WHERE id = $1", [docId]);
        return res.json({ success: true });
      }

      if (collection === 'system_broadcasts' && docId) {
        await pool.query("DELETE FROM system_broadcasts WHERE id = $1", [docId]);
        return res.json({ success: true });
      }

      if (collection === 'tanod_activity_logs' && docId) {
        await pool.query("DELETE FROM tanod_activity_logs WHERE id = $1", [docId]);
        return res.json({ success: true });
      }

      if (collection === 'incidents' && docId) {
        await pool.query("DELETE FROM incidents WHERE id = $1", [docId]);
        return res.json({ success: true });
      }

      res.status(404).json({ error: `Delete not supported for: ${fullPath}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/users/:id", authenticate, async (req: AuthRequest, res: any) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const { status, role } = req.body;
    const updates = [];
    const values = [];
    let i = 1;
    
    if (status) { updates.push(`status = $${i++}`); values.push(status); }
    if (role) { updates.push(`role = $${i++}`); values.push(role); }
    
    if (updates.length === 0) return res.status(400).json({ error: "Nothing to update" });
    
    values.push(req.params.id);
    
    try {
      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
      
      res.json({ success: true, user: result.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name, role, details } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const hashed = await bcrypt.hash(password, 10);
      const userResult = await client.query(
        "INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
        [email, hashed, name, role || 'resident']
      );
      
      const userId = userResult.rows[0].id;

      if (role === 'resident' && details) {
        await client.query(
          `INSERT INTO residents (id, phone, address, house_number, household_size, gps_lat, gps_lng) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userId, 
            details.mobileNumber, 
            details.address, 
            details.houseNumber, 
            parseInt(details.householdCount) || 1,
            details.gpsLat,
            details.gpsLng
          ]
        );
      }

      await client.query('COMMIT');
      const token = jwt.sign({ id: userId, role: userResult.rows[0].role }, JWT_SECRET);
      res.cookie("token", token, { httpOnly: true }).json({ user: userResult.rows[0], token });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      if (result.rows.length === 0) return res.status(401).json({ error: "User not found" });
      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });
      
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
      res.cookie("token", token, { httpOnly: true }).json({ 
        user: { id: user.id, email: user.email, name: user.name, role: user.role }, 
        token 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Data Routes ---
  app.get("/api/users/:id", authenticate, async (req: AuthRequest, res: any) => {
    try {
      const result = await pool.query("SELECT id, email, name, role FROM users WHERE id = $1", [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/residents/:id", authenticate, async (req: AuthRequest, res: any) => {
    try {
      const result = await pool.query("SELECT * FROM residents WHERE id = $1", [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Resident not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/alerts/active", authenticate, async (req: AuthRequest, res: any) => {
    try {
      const result = await pool.query("SELECT * FROM alerts WHERE status != 'resolved' ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- SOS Logic ---
  app.post("/api/sos/alert", authenticate, async (req: AuthRequest, res: any) => {
    const { type, location, description } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO alerts (resident_id, type, location, description) VALUES ($1, $2, $3, $4) RETURNING *",
        [req.user.id, type, JSON.stringify(location), description]
      );
      const alert = result.rows[0];
      io.emit("alert_update", { type: 'new', alert });
      res.json(alert);
    } catch (err: any) {
      console.error("SOS_ALERT_ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/sos/active", authenticate, async (req: AuthRequest, res: any) => {
    try {
      const result = await pool.query("SELECT * FROM alerts WHERE status != 'resolved' ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Patrol Logic ---
  app.post("/api/patrol/ping", authenticate, async (req: AuthRequest, res: any) => {
    const { location, isActive } = req.body;
    try {
      await pool.query(
        `INSERT INTO patrols (tanod_id, is_active, location, last_ping) 
         VALUES ($1, $2, $3, now()) 
         ON CONFLICT (tanod_id) DO UPDATE 
         SET is_active = $2, location = $3, last_ping = now()`,
        [req.user.id, isActive, JSON.stringify(location)]
      );
      io.emit("patrol_update", { tanod_id: req.user.id, location, isActive });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Analytics Logic ---
  app.get("/api/analytics/dashboard", authenticate, async (req: AuthRequest, res: any) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });

    try {
      const stats = await pool.query(`
        SELECT 
          (SELECT count(*) FROM users WHERE role = 'resident') as total_residents,
          (SELECT count(*) FROM users WHERE role = 'resident' AND status = 'verified') as verified_residents,
          (SELECT count(*) FROM alerts) as total_alerts,
          (SELECT count(*) FROM alerts WHERE status = 'active') as active_alerts,
          (SELECT count(*) FROM users WHERE role = 'tanod' AND status = 'verified') as total_tanods
      `);

      const alertsByType = await pool.query(`
        SELECT type, count(*) as count 
        FROM alerts 
        GROUP BY type 
        ORDER BY count DESC
      `);

      const alertsHistory = await pool.query(`
        SELECT 
          date_trunc('day', created_at) as day, 
          count(*) as count 
        FROM alerts 
        WHERE created_at > now() - interval '7 days'
        GROUP BY day 
        ORDER BY day ASC
      `);

      res.json({
        overview: stats.rows[0],
        alertsByType: alertsByType.rows,
        alertsHistory: alertsHistory.rows
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- AI Analysis (Guardian AI) ---
  // Note: AI analysis moved to frontend via aiService.ts as per platform guidelines.

  // Socket Connection
  io.on("connection", (socket) => {
    console.log("SOCKET: Connected", socket.id);
    socket.on("disconnect", () => console.log("SOCKET: Disconnected", socket.id));
  });

  app.post("/api/ai/analyze", authenticate, async (req: AuthRequest, res: any) => {
    const { description, initialType } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    const fallback = {
      incidentType: (initialType as string)?.toUpperCase() || "OTHER",
      severityScore: 5,
      urgency: "NORMAL",
      summary: description || "SOS Alert received.",
      recommendedResponders: ["Tanod Officer"],
      riskFactors: ["Manual verification required"],
      instructions: ["Stay calm", "Wait for responders"]
    };

    if (!geminiKey) return res.json(fallback);

    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [{ text: `Analyze this emergency incident for a Philippine Barangay. Description: "${description}". Initial Category: "${initialType}". Provide a structured emergency assessment.` }],
        config: {
          systemInstruction: "You are a tactical emergency dispatcher. Extract structured data from reports. Provide 3-5 immediate safety instructions for the victim.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              incidentType: { type: Type.STRING, enum: ["MEDICAL", "FIRE", "CRIME", "DISTURBANCE", "OTHER"] },
              severityScore: { type: Type.NUMBER },
              urgency: { type: Type.STRING, enum: ["LOW", "NORMAL", "HIGH", "CRITICAL"] },
              summary: { type: Type.STRING },
              recommendedResponders: { type: Type.ARRAY, items: { type: Type.STRING } },
              riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
              instructions: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["incidentType", "severityScore", "urgency", "summary", "recommendedResponders", "riskFactors", "instructions"]
          }
        }
      });
      if (response.text) return res.json(JSON.parse(response.text.trim()));
      return res.json(fallback);
    } catch (err: any) {
      console.error("AI_ANALYZE_ERROR:", err.message);
      return res.json(fallback);
    }
  });

  // Static Assets
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  server.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`CockroachDB Backend LIVE on port ${PORT}`);
  });
}

startServer();
