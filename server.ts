import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import * as http from "http";
import path from "path";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import pg from "pg";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const apiKey = process.env.GEMINI_API_KEY?.trim() || null;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_shhh";

// Initialize AI
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Database Pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false }
});

async function initDb() {
  let client;
  try {
    console.log("DB_INIT: Connecting to database...");
    if (!DATABASE_URL) {
      console.warn("DB_INIT: DATABASE_URL not found. Skipping schema sync.");
      return;
    }
    client = await pool.connect();
    console.log("DB_INIT: Verifying CockroachDB Schema...");
    
    // Users Table
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

    // Residents Table (Profile data)
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

    // SOS Alerts Table
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

    // Patrols Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS patrols (
        tanod_id UUID PRIMARY KEY REFERENCES users(id),
        is_active BOOLEAN DEFAULT false,
        location JSONB,
        last_ping TIMESTAMPTZ DEFAULT now()
      );
    `);

    console.log("DB_INIT: Schema synchronized.");

    // Bootstrap Admin (Ruben)
    const adminEmail = 'rubenlleg12@gmail.com';
    const adminResult = await client.query("SELECT * FROM users WHERE email = $1", [adminEmail]);
    if (adminResult.rows.length === 0) {
      console.log("DB_INIT: Bootstrapping Admin Account...");
      const hashedPass = await bcrypt.hash('admin123', 10);
      await client.query(
        "INSERT INTO users (email, password, name, role, status) VALUES ($1, $2, $3, $4, $5)",
        [adminEmail, hashedPass, 'Ruben (SuperAdmin)', 'admin', 'verified']
      );
    }
  } catch (err) {
    console.error("DB_INIT_ERROR:", err);
  } finally {
    if (client) client.release();
  }
}

async function startServer() {
  try {
    await initDb();
  } catch (err) {
    console.error("SERVER_START_DB_ERROR:", err);
  }

  const app = express();
  const PORT = process.env.PORT || 3000;
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
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
  app.use("/api/", limiter);

  // --- Auth Middleware ---
  const API_SECRET_KEY = process.env.API_SECRET_KEY;
  const authenticateApiKey = (req: any, res: any, next: any) => {
    if (!API_SECRET_KEY) return res.status(401).json({ error: "API key not configured on server" });
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key !== API_SECRET_KEY) return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
    next();
  };

  // Apply API key auth globally for /api/ as per memory instructions:
  // "The Express server uses an API key authentication middleware for all /api/ routes in server.ts. It validates the x-api-key header against the API_SECRET_KEY environment variable. It implements a 'fail-closed' policy"
  app.use("/api/", authenticateApiKey);

  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Auth required" });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

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
  app.get("/api/users/:id", authenticate, async (req, res) => {
    try {
      const result = await pool.query("SELECT id, email, name, role FROM users WHERE id = $1", [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/residents/:id", authenticate, async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM residents WHERE id = $1", [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Resident not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/alerts/active", authenticate, async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM alerts WHERE status != 'resolved' ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/alerts", authenticate, async (req, res) => {
    // Offline sync fallback
    const { type, location, description, id } = req.body;
    try {
      if (id) {
        const result = await pool.query(
          "INSERT INTO alerts (id, resident_id, type, location, description) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET type=$3, location=$4, description=$5 RETURNING *",
          [id, req.user.id, type, JSON.stringify(location), description]
        );
        res.json(result.rows[0]);
      } else {
        const result = await pool.query(
          "INSERT INTO alerts (resident_id, type, location, description) VALUES ($1, $2, $3, $4) RETURNING *",
          [req.user.id, type, JSON.stringify(location), description]
        );
        res.json(result.rows[0]);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/alerts/:id", authenticate, async (req, res) => {
    // Offline sync fallback for updating docs
    const { type, location, description } = req.body;
    try {
      const result = await pool.query(
        "UPDATE alerts SET type=$1, location=$2, description=$3 WHERE id=$4 RETURNING *",
        [type, JSON.stringify(location), description, req.params.id]
      );
      res.json(result.rows[0] || {});
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- SOS Logic ---
  app.post("/api/sos/alert", authenticate, async (req, res) => {
    const { type, location, description } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO alerts (resident_id, type, location, description) VALUES ($1, $2, $3, $4) RETURNING *",
        [req.user.id, type, JSON.stringify(location), description]
      );

      const userResult = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
      const userName = userResult.rows.length > 0 ? userResult.rows[0].name : 'Resident';

      const alert = result.rows[0];
      io.emit("sos_new", { ...alert, residentName: userName });
      res.json(alert);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/sos/active", authenticate, async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM alerts WHERE status != 'resolved' ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Patrol Logic ---
  app.post("/api/patrol/ping", authenticate, async (req, res) => {
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

  // --- AI Analysis ---
  app.post("/api/ai/analyze", authenticate, async (req, res) => {
    if (!ai) return res.status(503).json({ error: "AI not configured" });
    // ... AI logic handled by Gemini skill pattern later if needed
    res.json({ analysis: "Automated analysis pending refactor" });
  });

  // Socket Connection
  io.on("connection", (socket) => {
    console.log("SOCKET: Connected", socket.id);
    socket.on("disconnect", () => console.log("SOCKET: Disconnected", socket.id));
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
