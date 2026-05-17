var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/server/config/index.ts
var import_dotenv, config;
var init_config = __esm({
  "src/server/config/index.ts"() {
    import_dotenv = __toESM(require("dotenv"), 1);
    import_dotenv.default.config();
    if (process.env.NODE_ENV === "production") {
      const REQUIRED = ["JWT_SECRET", "DATABASE_URL", "CORS_ORIGIN"];
      const missing = REQUIRED.filter((k) => !process.env[k]);
      if (missing.length > 0) {
        console.error(
          `
[FATAL] Missing required environment variables: ${missing.join(", ")}
The server cannot start safely without these values set.
Set them in your .env file or hosting dashboard and restart.
`
        );
        process.exit(1);
      }
    }
    config = {
      // Port now reads from environment — required for cloud hosts (Railway, Render, etc.)
      port: Number(process.env.PORT) || 3e3,
      nodeEnv: process.env.NODE_ENV || "development",
      // NO unsafe fallback. Dev gets a long random string; prod fails above if unset.
      jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV !== "production" ? "DEV_ONLY_jwt_secret_change_before_deploy_32chars" : ""),
      databaseUrl: (process.env.COCKROACH_URL || process.env.DATABASE_URL || "").trim().replace(/[\u200B-\u200D\uFEFF]/g, ""),
      geminiApiKey: (process.env.MY_GEMINI_SECRET || process.env.GEMINI_API_KEY)?.trim() || null,
      guardianAiKey: (process.env.GUARDIAN_AI_KEY || process.env.MY_GEMINI_SECRET || process.env.GEMINI_API_KEY)?.trim() || null,
      geminiModel: (process.env.GEMINI_MODEL || "gemini-flash-lite-latest").replace(/^models\//, ""),
      adminBootstrap: {
        email: process.env.ADMIN_BOOTSTRAP_EMAIL,
        password: process.env.ADMIN_BOOTSTRAP_PASSWORD
      },
      // Default is now EMPTY STRING, not '*'. Forces explicit configuration.
      corsOrigin: process.env.CORS_ORIGIN || "",
      elevenLabs: {
        apiKeys: (process.env.ELEVENLABS_API_KEYS || process.env.ELEVENLABS_API_KEY || "").split(",").map((k) => k.trim()).filter(Boolean),
        voiceId: (() => {
          const vid = (process.env.JARVIS_VOICE_ID || "pNInz6obpgDQGcFmaJgB").trim();
          if (vid.includes("voiceId=")) {
            const parts = vid.split("voiceId=");
            if (parts[1]) return parts[1].split("&")[0];
          }
          if (vid.includes("/")) return vid.split("/").pop() || vid;
          return vid;
        })()
      },
      fishAudio: {
        apiKeys: (process.env.FISHAUDIO_API_KEYS || process.env.FISHAUDIO_API_KEY || "").split(",").map((k) => k.trim()).filter(Boolean)
      },
      firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || "demo-project"
      },
      apiKey: process.env.API_KEY || null
    };
  }
});

// src/server/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  alertMessages: () => alertMessages,
  alerts: () => alerts,
  auditLogArchives: () => auditLogArchives,
  auditLogs: () => auditLogs,
  incidents: () => incidents,
  patrolSessions: () => patrolSessions,
  patrols: () => patrols,
  residents: () => residents,
  shifts: () => shifts,
  systemBroadcasts: () => systemBroadcasts,
  systemConfig: () => systemConfig,
  tanodActivityLogs: () => tanodActivityLogs,
  users: () => users,
  witnessInvites: () => witnessInvites
});
var import_pg_core, import_drizzle_orm, users, residents, alerts, patrols, alertMessages, systemConfig, systemBroadcasts, witnessInvites, shifts, auditLogs, auditLogArchives, tanodActivityLogs, incidents, patrolSessions;
var init_schema = __esm({
  "src/server/db/schema.ts"() {
    import_pg_core = require("drizzle-orm/pg-core");
    import_drizzle_orm = require("drizzle-orm");
    users = (0, import_pg_core.pgTable)("users", {
      id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
      email: (0, import_pg_core.text)("email").unique().notNull(),
      password: (0, import_pg_core.text)("password").notNull(),
      name: (0, import_pg_core.text)("name").notNull(),
      role: (0, import_pg_core.text)("role").notNull().default("resident"),
      status: (0, import_pg_core.text)("status").notNull().default("pending"),
      createdAt: (0, import_pg_core.timestamp)("created_at", { withTimezone: true }).defaultNow(),
      lastActive: (0, import_pg_core.timestamp)("last_active", { withTimezone: true }).defaultNow()
    });
    residents = (0, import_pg_core.pgTable)("residents", {
      id: (0, import_pg_core.uuid)("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
      name: (0, import_pg_core.text)("name"),
      phone: (0, import_pg_core.text)("phone"),
      address: (0, import_pg_core.text)("address"),
      houseNumber: (0, import_pg_core.text)("house_number"),
      householdSize: (0, import_pg_core.integer)("household_size").default(1),
      bloodType: (0, import_pg_core.text)("blood_type"),
      medicalConditions: (0, import_pg_core.text)("medical_conditions").array(),
      emergencyContactName: (0, import_pg_core.text)("emergency_contact_name"),
      emergencyContactPhone: (0, import_pg_core.text)("emergency_contact_phone"),
      gpsLat: (0, import_pg_core.doublePrecision)("gps_lat"),
      gpsLng: (0, import_pg_core.doublePrecision)("gps_lng"),
      status: (0, import_pg_core.text)("status").default("pending"),
      isVerified: (0, import_pg_core.boolean)("is_verified").default(false),
      verificationDate: (0, import_pg_core.timestamp)("verification_date", { withTimezone: true })
    });
    alerts = (0, import_pg_core.pgTable)("alerts", {
      id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
      residentId: (0, import_pg_core.uuid)("resident_id").references(() => users.id),
      type: (0, import_pg_core.text)("type").notNull(),
      status: (0, import_pg_core.text)("status").notNull().default("active"),
      location: (0, import_pg_core.jsonb)("location").notNull(),
      description: (0, import_pg_core.text)("description"),
      severityScore: (0, import_pg_core.integer)("severity_score"),
      urgencyLevel: (0, import_pg_core.text)("urgency_level"),
      responderRecommendations: (0, import_pg_core.jsonb)("responder_recommendations"),
      aiAnalysis: (0, import_pg_core.jsonb)("ai_analysis"),
      assignedTo: (0, import_pg_core.uuid)("assigned_to"),
      assignedToName: (0, import_pg_core.text)("assigned_to_name"),
      respondedBy: (0, import_pg_core.uuid)("responded_by"),
      respondedByName: (0, import_pg_core.text)("responded_by_name"),
      respondedAt: (0, import_pg_core.timestamp)("responded_at", { withTimezone: true }),
      resolutionNotes: (0, import_pg_core.text)("resolution_notes"),
      responderNotes: (0, import_pg_core.text)("responder_notes"),
      createdAt: (0, import_pg_core.timestamp)("created_at", { withTimezone: true }).defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
      resolvedAt: (0, import_pg_core.timestamp)("resolved_at", { withTimezone: true })
    });
    patrols = (0, import_pg_core.pgTable)("patrols", {
      tanodId: (0, import_pg_core.uuid)("tanod_id").primaryKey().references(() => users.id),
      tanodName: (0, import_pg_core.text)("tanod_name"),
      isActive: (0, import_pg_core.boolean)("is_active").default(false),
      location: (0, import_pg_core.jsonb)("location"),
      status: (0, import_pg_core.text)("status"),
      lastPing: (0, import_pg_core.timestamp)("last_ping", { withTimezone: true }).defaultNow()
    });
    alertMessages = (0, import_pg_core.pgTable)("alert_messages", {
      id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
      alertId: (0, import_pg_core.uuid)("alert_id").references(() => alerts.id, { onDelete: "cascade" }),
      senderId: (0, import_pg_core.uuid)("sender_id").references(() => users.id),
      senderName: (0, import_pg_core.text)("sender_name"),
      message: (0, import_pg_core.text)("message").notNull(),
      type: (0, import_pg_core.text)("type").default("text"),
      timestamp: (0, import_pg_core.timestamp)("timestamp", { withTimezone: true }).defaultNow()
    });
    systemConfig = (0, import_pg_core.pgTable)("system_config", {
      key: (0, import_pg_core.text)("key").primaryKey(),
      data: (0, import_pg_core.jsonb)("data").notNull(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at", { withTimezone: true }).defaultNow()
    });
    systemBroadcasts = (0, import_pg_core.pgTable)("system_broadcasts", {
      id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
      incidentId: (0, import_pg_core.uuid)("incident_id").references(() => alerts.id),
      message: (0, import_pg_core.text)("message").notNull(),
      timestamp: (0, import_pg_core.timestamp)("timestamp", { withTimezone: true }).defaultNow(),
      isActive: (0, import_pg_core.boolean)("isactive").default(false),
      adminId: (0, import_pg_core.uuid)("admin_id"),
      adminName: (0, import_pg_core.text)("admin_name"),
      type: (0, import_pg_core.text)("type"),
      approvalStatus: (0, import_pg_core.text)("approval_status").default("pending"),
      // 'pending', 'approved', 'rejected'
      aiRecommendation: (0, import_pg_core.jsonb)("ai_recommendation")
    });
    witnessInvites = (0, import_pg_core.pgTable)("witness_invites", {
      id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
      alertId: (0, import_pg_core.uuid)("alert_id").references(() => alerts.id, { onDelete: "cascade" }),
      witnessUserId: (0, import_pg_core.uuid)("witness_user_id").references(() => users.id),
      status: (0, import_pg_core.text)("status").notNull().default("pending"),
      timestamp: (0, import_pg_core.timestamp)("timestamp", { withTimezone: true }).defaultNow()
    });
    shifts = (0, import_pg_core.pgTable)("shifts", {
      id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
      tanodId: (0, import_pg_core.uuid)("tanod_id").references(() => users.id),
      tanodName: (0, import_pg_core.text)("tanod_name"),
      startTime: (0, import_pg_core.timestamp)("start_time", { withTimezone: true }),
      endTime: (0, import_pg_core.timestamp)("end_time", { withTimezone: true }),
      sector: (0, import_pg_core.text)("sector"),
      status: (0, import_pg_core.text)("status").default("scheduled"),
      tanodResponse: (0, import_pg_core.text)("tanod_response").default("pending"),
      notes: (0, import_pg_core.text)("notes"),
      createdAt: (0, import_pg_core.timestamp)("created_at", { withTimezone: true }).defaultNow()
    });
    auditLogs = (0, import_pg_core.pgTable)("audit_logs", {
      id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
      incidentId: (0, import_pg_core.uuid)("incident_id"),
      type: (0, import_pg_core.text)("type"),
      status: (0, import_pg_core.text)("status"),
      citizenId: (0, import_pg_core.uuid)("citizen_id"),
      tanodAssigned: (0, import_pg_core.text)("tanod_assigned"),
      locationLat: (0, import_pg_core.doublePrecision)("location_lat"),
      locationLng: (0, import_pg_core.doublePrecision)("location_lng"),
      createdAt: (0, import_pg_core.timestamp)("created_at", { withTimezone: true }).defaultNow(),
      notes: (0, import_pg_core.text)("notes")
    });
    auditLogArchives = (0, import_pg_core.pgTable)("audit_log_archives", {
      id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
      sessionDate: (0, import_pg_core.text)("session_date").notNull(),
      archivedAt: (0, import_pg_core.timestamp)("archived_at", { withTimezone: true }).defaultNow(),
      archivedBy: (0, import_pg_core.text)("archived_by"),
      logCount: (0, import_pg_core.integer)("log_count").default(0),
      totalIncidents: (0, import_pg_core.integer)("total_incidents").default(0),
      resolvedCount: (0, import_pg_core.integer)("resolved_count").default(0),
      unresolvedCount: (0, import_pg_core.integer)("unresolved_count").default(0),
      logEntries: (0, import_pg_core.jsonb)("log_entries").default(import_drizzle_orm.sql`'[]'::jsonb`),
      notes: (0, import_pg_core.text)("notes")
    });
    tanodActivityLogs = (0, import_pg_core.pgTable)("tanod_activity_logs", {
      id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
      tanodId: (0, import_pg_core.uuid)("tanod_id").references(() => users.id),
      tanodName: (0, import_pg_core.text)("tanod_name"),
      type: (0, import_pg_core.text)("type"),
      timestamp: (0, import_pg_core.timestamp)("timestamp", { withTimezone: true }).defaultNow(),
      details: (0, import_pg_core.text)("details"),
      location: (0, import_pg_core.jsonb)("location")
    });
    incidents = (0, import_pg_core.pgTable)("incidents", {
      id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
      alertId: (0, import_pg_core.uuid)("alert_id").references(() => alerts.id),
      tanodId: (0, import_pg_core.uuid)("tanod_id").references(() => users.id),
      tanodName: (0, import_pg_core.text)("tanod_name"),
      timestamp: (0, import_pg_core.timestamp)("timestamp", { withTimezone: true }),
      type: (0, import_pg_core.text)("type"),
      location: (0, import_pg_core.text)("location"),
      gpsLocation: (0, import_pg_core.jsonb)("gps_location"),
      description: (0, import_pg_core.text)("description"),
      personsInvolved: (0, import_pg_core.text)("persons_involved"),
      actionsTaken: (0, import_pg_core.text)("actions_taken"),
      status: (0, import_pg_core.text)("status"),
      citizenName: (0, import_pg_core.text)("citizen_name"),
      // Added column
      assignedTo: (0, import_pg_core.uuid)("assigned_to"),
      assignedToName: (0, import_pg_core.text)("assigned_to_name"),
      respondedBy: (0, import_pg_core.uuid)("responded_by"),
      respondedByName: (0, import_pg_core.text)("responded_by_name"),
      respondedAt: (0, import_pg_core.timestamp)("responded_at", { withTimezone: true }),
      resolvedAt: (0, import_pg_core.timestamp)("resolved_at", { withTimezone: true }),
      resolutionNotes: (0, import_pg_core.text)("resolution_notes"),
      responderNotes: (0, import_pg_core.text)("responder_notes"),
      adminOnDuty: (0, import_pg_core.uuid)("admin_on_duty")
      // Added missing column too based on postSync query
    });
    patrolSessions = (0, import_pg_core.pgTable)("patrol_sessions", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      tanodId: (0, import_pg_core.uuid)("tanod_id").references(() => users.id),
      tanodName: (0, import_pg_core.text)("tanod_name"),
      startTime: (0, import_pg_core.timestamp)("start_time", { withTimezone: true }).defaultNow(),
      endTime: (0, import_pg_core.timestamp)("end_time", { withTimezone: true }),
      route: (0, import_pg_core.jsonb)("route").default(import_drizzle_orm.sql`'[]'::jsonb`)
    });
  }
});

// src/server/db/index.ts
var db_exports = {};
__export(db_exports, {
  admin: () => import_firebase_admin.default,
  checkConnection: () => checkConnection,
  db: () => db,
  getClient: () => getClient,
  getDb: () => getDb,
  initDatabase: () => initDatabase,
  pool: () => pool,
  query: () => query
});
var import_firebase_admin, import_pg, import_node_postgres, Pool, pool, db, query, getClient, checkConnection, firebaseDb, initDatabase, getDb;
var init_db = __esm({
  "src/server/db/index.ts"() {
    import_firebase_admin = __toESM(require("firebase-admin"), 1);
    init_config();
    import_pg = __toESM(require("pg"), 1);
    import_node_postgres = require("drizzle-orm/node-postgres");
    init_schema();
    ({ Pool } = import_pg.default);
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseUrl?.includes("localhost") ? false : { rejectUnauthorized: true },
      connectionTimeoutMillis: 5e3,
      query_timeout: 1e4
    });
    db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });
    query = (text2, params) => pool.query(text2, params);
    getClient = () => pool.connect();
    checkConnection = async () => {
      try {
        const client = await pool.connect();
        client.release();
        return true;
      } catch (err) {
        return false;
      }
    };
    initDatabase = () => {
      if (!import_firebase_admin.default.apps.length) {
        import_firebase_admin.default.initializeApp({
          projectId: config.firebase.projectId
          // For production: use service account credentials
          // credential: admin.credential.cert({...})
        });
        console.log("[DB] Firebase app initialized successfully");
      }
      if (!firebaseDb) {
        firebaseDb = import_firebase_admin.default.firestore();
        firebaseDb.settings({
          ignoreUndefinedProperties: true
        });
        console.log("[DB] Firebase Firestore initialized successfully");
      }
      return firebaseDb;
    };
    getDb = () => {
      if (!firebaseDb) {
        firebaseDb = initDatabase();
      }
      return firebaseDb;
    };
  }
});

// src/server/utils/response.ts
var success, error;
var init_response = __esm({
  "src/server/utils/response.ts"() {
    success = (res, data, message = "Success", status = 200) => {
      return res.status(status).json({
        success: true,
        data,
        message
      });
    };
    error = (res, message = "Error", code = "INTERNAL_ERROR", status = 500) => {
      return res.status(status).json({
        success: false,
        error: {
          code,
          message
        }
      });
    };
  }
});

// src/server/middleware/error.ts
var error_exports = {};
__export(error_exports, {
  AppError: () => AppError,
  errorHandler: () => errorHandler,
  notFoundHandler: () => notFoundHandler
});
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${(/* @__PURE__ */ new Date()).toISOString()} - ${err.message || err}`);
  if (err.stack) console.error(err.stack);
  const status = err.status || 500;
  const code = err.code || "INTERNAL_SERVER_ERROR";
  let message = "Something went wrong on the server";
  if (err instanceof AppError || status < 500) {
    message = err.message;
  }
  error(res, message, code, status);
}
function notFoundHandler(req, res) {
  error(res, `Route ${req.originalUrl} not found`, "NOT_FOUND", 404);
}
var AppError;
var init_error = __esm({
  "src/server/middleware/error.ts"() {
    init_response();
    AppError = class _AppError extends Error {
      constructor(message, status = 500, code = "INTERNAL_SERVER_ERROR") {
        super(message);
        this.message = message;
        this.status = status;
        this.code = code;
        this.name = "AppError";
        Object.setPrototypeOf(this, _AppError.prototype);
      }
      message;
      status;
      code;
    };
  }
});

// src/server/utils/roleUtils.ts
function normalizeRole(role) {
  return role?.toLowerCase() || "resident";
}
function isTanodOrAbove(role) {
  const r = normalizeRole(role);
  return ["tanod", "admin", "superadmin", "captain"].includes(r);
}
function isAdminOrAbove(role) {
  const r = normalizeRole(role);
  return ["admin", "superadmin", "captain"].includes(r);
}
var init_roleUtils = __esm({
  "src/server/utils/roleUtils.ts"() {
  }
});

// src/server/sockets/handlers/location.handler.ts
var location_handler_exports = {};
__export(location_handler_exports, {
  getActiveLocations: () => getActiveLocations,
  setupLocationHandlers: () => setupLocationHandlers,
  startLocationExpiryTask: () => startLocationExpiryTask
});
function getActiveLocations() {
  return Object.values(activeLocations);
}
function setupLocationHandlers(io3, socket) {
  const user = socket.data.user;
  if (isTanodOrAbove(user.role)) {
    socket.emit("location_map", activeLocations);
  }
  socket.on("location_update", (data) => {
    if (!data.user_id || typeof data.lat !== "number" || typeof data.lng !== "number") return;
    const newEntry = {
      ...data,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    activeLocations[data.user_id] = newEntry;
    io3.to("responders").emit("location_update_delta", newEntry);
  });
  socket.on("disconnect", () => {
    if (user && user.id) {
      delete activeLocations[user.id];
      io3.to("responders").emit("location_remove_delta", { user_id: user.id });
    }
  });
}
function startLocationExpiryTask(io3) {
  setInterval(() => {
    const now = Date.now();
    const expiryMs = 5 * 60 * 1e3;
    Object.keys(activeLocations).forEach((userId) => {
      const loc = activeLocations[userId];
      if (loc.timestamp) {
        const age = now - new Date(loc.timestamp).getTime();
        if (age > expiryMs) {
          delete activeLocations[userId];
          io3.to("responders").emit("location_remove_delta", { user_id: userId });
        }
      }
    });
  }, 6e4);
}
var activeLocations;
var init_location_handler = __esm({
  "src/server/sockets/handlers/location.handler.ts"() {
    init_roleUtils();
    activeLocations = {};
  }
});

// src/server/utils/geo.ts
var geo_exports = {};
__export(geo_exports, {
  haversineDistance: () => haversineDistance
});
function haversineDistance(a, b) {
  const R = 6371e3;
  const toRad = (deg) => deg * Math.PI / 180;
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const deltaPhi = toRad(b.lat - a.lat);
  const deltaLambda = toRad(b.lng - a.lng);
  const h = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
var init_geo = __esm({
  "src/server/utils/geo.ts"() {
  }
});

// server.ts
var http = __toESM(require("http"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_express10 = __toESM(require("express"), 1);

// src/server/app.ts
var import_express_async_errors = require("express-async-errors");
var import_express9 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);

// src/server/routes/authRoutes.ts
var import_express = require("express");

// src/server/controllers/authController.ts
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
init_db();
init_config();
init_response();

// src/server/services/auditService.ts
init_db();

// src/server/utils/logger.ts
init_config();
var levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};
var log = (level, message, meta) => {
  if (levels[level] <= levels.info || config.nodeEnv !== "production") {
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
    console.log(`[${timestamp2}] [${level.toUpperCase()}] ${message}${metaStr}`);
  }
};
var logger = {
  info: (msg, meta) => log("info", msg, meta),
  error: (msg, meta) => log("error", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  debug: (msg, meta) => log("debug", msg, meta)
};

// src/server/services/auditService.ts
async function logAction(userId, action, entityType, entityId, metadata = {}) {
  try {
    await pool.query(
      "INSERT INTO audit_logs (citizen_id, type, notes, created_at) VALUES ($1, $2, $3, now())",
      [userId, action, JSON.stringify({ entityType, entityId, ...metadata })]
    );
    logger.debug(`Audit log: ${action} on ${entityType}:${entityId} by user:${userId}`);
  } catch (err) {
    logger.error(`Failed to create audit log: ${err.message}`);
  }
}

// src/server/controllers/authController.ts
var cookieOptions = {
  httpOnly: true,
  // JS cannot read this cookie
  secure: true,
  // Require secure (needed for sameSite: 'none')
  sameSite: "none",
  // Must be 'none' for cross-origin iframes
  maxAge: 7 * 24 * 60 * 60 * 1e3
  // 7 days
};
var register = async (req, res) => {
  const { email: rawEmail, password, name, role: rawRole, details } = req.body;
  const email = rawEmail?.toLowerCase();
  const allowedPublicRoles = ["resident", "tanod"];
  const role = allowedPublicRoles.includes(rawRole) ? rawRole : "resident";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userResult = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (userResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return error(res, "Registration failed. Please check your details.", "CONFLICT", 409);
    }
    const hashedPass = await import_bcryptjs.default.hash(password, 12);
    const result = await client.query(
      `INSERT INTO users (email, password, name, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, status`,
      [email, hashedPass, name, role, "pending"]
      // ALL self-registrations start as 'pending'
    );
    const user = result.rows[0];
    if (role === "resident" && details) {
      await client.query(
        `INSERT INTO residents
           (id, name, phone, address, house_number, household_size,
            blood_type, medical_conditions,
            emergency_contact_name, emergency_contact_phone,
            gps_lat, gps_lng)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          user.id,
          name,
          details.phone,
          details.address,
          details.houseNumber,
          details.householdSize,
          details.bloodType,
          details.medicalConditions,
          details.emergencyContactName,
          details.emergencyContactPhone,
          details.gpsLat,
          details.gpsLng
        ]
      );
    } else if (role === "tanod") {
      await client.query(
        `INSERT INTO patrols (tanod_id, tanod_name, is_active, status)
         VALUES ($1, $2, false, 'offline')`,
        [user.id, name]
      );
    }
    await logAction(user.id, "USER_REGISTERED", "users", user.id, { role: user.role });
    await client.query("COMMIT");
    const token = import_jsonwebtoken.default.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, cookieOptions);
    return success(
      res,
      { user },
      "Registration successful. Awaiting admin approval.",
      201
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Auth] Register error:", err.message);
    return error(res, "Registration failed. Please try again.");
  } finally {
    client.release();
  }
};
var login = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email?.toLowerCase();
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [normalizedEmail]
    );
    const user = result.rows[0];
    const dummyHash = "$2a$12$invaliddummyhashfortimingprotection000000000000000000";
    const passwordMatch = user ? await import_bcryptjs.default.compare(password, user.password) : await import_bcryptjs.default.compare(password, dummyHash).then(() => false);
    if (!user || !passwordMatch) {
      return error(res, "Invalid email or password.", "UNAUTHORIZED", 401);
    }
    await logAction(user.id, "USER_LOGIN", "users", user.id);
    const token = import_jsonwebtoken.default.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, cookieOptions);
    const { password: _, ...userWithoutPass } = user;
    return success(res, { user: userWithoutPass }, "Login successful");
  } catch (err) {
    console.error("[Auth] Login error:", err.message);
    return error(res, "Login failed. Please try again.");
  }
};
var logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  });
  return success(res, null, "Logged out successfully");
};
var me = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, name, role, status, last_active FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return error(res, "User not found", "NOT_FOUND", 404);
    return success(res, user);
  } catch (err) {
    console.error("[Auth] Me error:", err.message);
    return error(res, "Could not retrieve user.", "SERVER_ERROR", 500);
  }
};

// src/server/middleware/validate.ts
var import_zod = require("zod");
init_response();
var validate = (schema) => {
  return async (req, res, next) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error2) {
      if (error2 instanceof import_zod.ZodError) {
        return error(
          res,
          "Validation failed",
          "VALIDATION_ERROR",
          400
        );
      }
      next(error2);
    }
  };
};

// src/server/validators/authValidator.ts
var import_zod2 = require("zod");
var loginSchema = import_zod2.z.object({
  email: import_zod2.z.string().email(),
  password: import_zod2.z.string().min(6)
});
var registerSchema = import_zod2.z.object({
  email: import_zod2.z.string().email(),
  password: import_zod2.z.string().min(8, "Password must be at least 8 characters"),
  // raised from 6
  name: import_zod2.z.string().min(2).max(100),
  // Residents and Tanods can self-register. That's it.
  role: import_zod2.z.enum(["resident", "tanod"]).default("resident"),
  details: import_zod2.z.object({
    phone: import_zod2.z.string().optional(),
    address: import_zod2.z.string().optional(),
    houseNumber: import_zod2.z.string().optional(),
    householdSize: import_zod2.z.number().int().min(1).optional(),
    bloodType: import_zod2.z.string().optional(),
    medicalConditions: import_zod2.z.array(import_zod2.z.string()).optional(),
    emergencyContactName: import_zod2.z.string().optional(),
    emergencyContactPhone: import_zod2.z.string().optional(),
    gpsLat: import_zod2.z.number().min(-90).max(90).optional(),
    gpsLng: import_zod2.z.number().min(-180).max(180).optional()
  }).optional()
});
var adminCreateUserSchema = import_zod2.z.object({
  email: import_zod2.z.string().email(),
  password: import_zod2.z.string().min(8),
  name: import_zod2.z.string().min(2).max(100),
  role: import_zod2.z.enum(["resident", "tanod", "admin", "superadmin"]),
  details: import_zod2.z.object({
    phone: import_zod2.z.string().optional(),
    address: import_zod2.z.string().optional()
  }).optional()
});

// src/server/middleware/auth.ts
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"), 1);
init_config();
function authenticate(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  const apiKey = req.headers["x-api-key"];
  if (apiKey && config.apiKey && apiKey === config.apiKey) {
    req.user = {
      id: "system",
      email: "system@tanod.sos",
      role: "admin"
      // Or some kind of system role
    };
    logger.warn(`[AUTH] API Key usage detected. User: system, Route: ${req.originalUrl}`);
    return next();
  }
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" }
    });
  }
  try {
    const decoded = import_jsonwebtoken2.default.verify(token, config.jwtSecret);
    req.user = decoded;
    logger.info(`[AUTH] Authenticated user: ${req.user.id} role: ${req.user.role}`);
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: { code: "INVALID_TOKEN", message: "Invalid or expired token" }
    });
  }
}
function authorize(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.error(`[AUTH] Authorization failed. User: ${JSON.stringify(req.user)}, Required roles: ${roles.join(", ")}`);
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Insufficient permissions" }
      });
    }
    next();
  };
}

// src/server/routes/authRoutes.ts
var router = (0, import_express.Router)();
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", authenticate, me);
var authRoutes_default = router;

// src/server/routes/sosRoutes.ts
var import_express2 = require("express");

// src/server/utils/apiResponse.ts
var ApiResponse = class {
  static success(data, message = "Success") {
    return {
      success: true,
      data,
      message
    };
  }
  static error(message = "Error", code = "INTERNAL_ERROR") {
    return {
      success: false,
      error: {
        code,
        message
      }
    };
  }
};

// src/server/db/repositories/IncidentRepository.ts
init_db();
init_error();
var IncidentRepository = class {
  async create(data) {
    try {
      const location = JSON.stringify({ lat: data.latitude, lng: data.longitude });
      const aiAnalysisObj = data.aiAnalysis;
      const aiAnalysis = aiAnalysisObj ? JSON.stringify(aiAnalysisObj) : null;
      const severityScore = aiAnalysisObj?.severityScore || null;
      const urgencyLevel = aiAnalysisObj?.urgency || null;
      const responderRecommendations = aiAnalysisObj?.recommendedResponders ? JSON.stringify(aiAnalysisObj.recommendedResponders) : null;
      const result = await pool.query(
        `INSERT INTO alerts (resident_id, type, description, location, status, ai_analysis, severity_score, urgency_level, responder_recommendations, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()) RETURNING *`,
        [data.reporterId, data.type, data.description || "", location, data.status ? data.status.toLowerCase() : "pending", aiAnalysis, severityScore, urgencyLevel, responderRecommendations]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        reporterId: row.resident_id,
        barangayId: data.barangayId,
        // not in DB schema, keep in-memory
        type: row.type,
        status: row.status,
        description: row.description,
        location: row.location,
        latitude: row.location?.lat,
        longitude: row.location?.lng,
        aiAnalysis: row.ai_analysis,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (err) {
      console.error("[IncidentRepository] Create error:", err);
      throw new AppError("Failed to create record", 500, "DB_CREATE_ERROR");
    }
  }
  async getCountsByStatus() {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'responding') as responding
      FROM alerts;
    `);
    return {
      pending: parseInt(result.rows[0].pending, 10),
      responding: parseInt(result.rows[0].responding, 10)
    };
  }
  async findActiveByBarangay(barangayId, limit = 30) {
    const result = await pool.query(
      `
      SELECT * FROM alerts
      WHERE status IN ('pending', 'active', 'responding')
      ORDER BY created_at DESC
      LIMIT $1`,
      [limit]
    );
    return result.rows.map((row) => ({
      id: row.id,
      reporterId: row.resident_id,
      barangayId,
      type: row.type,
      status: row.status,
      description: row.description,
      location: row.location,
      latitude: row.location?.lat,
      longitude: row.location?.lng,
      aiAnalysis: row.ai_analysis,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
  async findByReporter(reporterId, limit = 10) {
    const result = await pool.query(
      `SELECT * FROM alerts WHERE resident_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [reporterId, limit]
    );
    return result.rows.map((row) => ({
      id: row.id,
      reporterId: row.resident_id,
      type: row.type,
      status: row.status,
      description: row.description,
      location: row.location,
      latitude: row.location?.lat,
      longitude: row.location?.lng,
      aiAnalysis: row.ai_analysis,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
  async findByStatus(status, barangayId) {
    const result = await pool.query(`
      SELECT * FROM alerts WHERE status = $1 ORDER BY created_at DESC
    `, [status]);
    return result.rows.map((row) => ({
      id: row.id,
      reporterId: row.resident_id,
      type: row.type,
      status: row.status,
      description: row.description,
      location: row.location,
      latitude: row.location?.lat,
      longitude: row.location?.lng,
      aiAnalysis: row.ai_analysis,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
};

// src/server/db/repositories/UserRepository.ts
init_db();
var UserRepository = class {
  async findById(id) {
    const result = await pool.query(
      "SELECT id, email, name, role, status, created_at, last_active FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }
  async findByEmail(email) {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0];
  }
  async create(userData) {
    const { email, password, name, role = "resident", status = "pending" } = userData;
    const result = await pool.query(
      `INSERT INTO users (email, password, name, role, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, status, created_at`,
      [email, password, name, role, status]
    );
    logger.info(`New user created: ${email} (${role})`);
    return result.rows[0];
  }
  async updateLastActive(id) {
    await pool.query(
      "UPDATE users SET last_active = now() WHERE id = $1",
      [id]
    );
  }
  async findAllByRole(role, limit = 50) {
    const result = await pool.query(
      "SELECT id, name, email, role, status FROM users WHERE role = $1 LIMIT $2",
      [role, limit]
    );
    return result.rows;
  }
  async updateStatus(id, status) {
    const result = await pool.query(
      "UPDATE users SET status = $1, updated_at = now() WHERE id = $2 RETURNING *",
      [status, id]
    );
    return result.rows[0];
  }
};
var userRepository = new UserRepository();

// src/server/db/repositories/TanodLocationRepository.ts
init_db();
var TanodLocationRepository = class {
  async updateLocation(data) {
    const result = await pool.query(
      `INSERT INTO patrols (tanod_id, tanod_name, is_active, location, last_ping)
       VALUES ($1, $2, true, $3, now())
       ON CONFLICT (tanod_id)
       DO UPDATE SET
         location = $3,
         is_active = true,
         last_ping = now()
       RETURNING *`,
      [
        data.userId,
        data.role,
        // temporary, better to join with users later
        JSON.stringify({ lat: data.latitude, lng: data.longitude, accuracy: data.accuracy })
      ]
    );
    logger.debug(`Tanod location updated: ${data.userId}`);
    return result.rows[0];
  }
  async getActiveTanods() {
    const result = await pool.query(`
      SELECT p.*, u.name as tanod_name
      FROM patrols p
      JOIN users u ON p.tanod_id = u.id
      WHERE p.is_active = true
        AND p.last_ping > now() - INTERVAL '15 minutes'
    `);
    return result.rows;
  }
  async deactivateLocation(userId) {
    await pool.query(
      "UPDATE patrols SET is_active = false WHERE tanod_id = $1",
      [userId]
    );
  }
};
var tanodLocationRepository = new TanodLocationRepository();

// src/server/db/repositories/AuditLogRepository.ts
init_db();
var AuditLogRepository = class {
  async create(log3) {
    const result = await pool.query(
      `INSERT INTO audit_logs (
        incident_id, type, status, citizen_id,
        tanod_assigned, location_lat, location_lng, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        log3.incident_id,
        log3.type,
        log3.status,
        log3.citizen_id,
        log3.tanod_assigned,
        log3.location_lat,
        log3.location_lng,
        log3.notes
      ]
    );
    logger.info(`Audit log created: ${log3.type}`);
    return result.rows[0];
  }
  async getByIncident(incidentId) {
    const result = await pool.query(
      "SELECT * FROM audit_logs WHERE incident_id = $1 ORDER BY created_at DESC",
      [incidentId]
    );
    return result.rows;
  }
  async getRecentLogs(limit = 100) {
    const result = await pool.query(
      "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1",
      [limit]
    );
    return result.rows;
  }
};
var auditLogRepository = new AuditLogRepository();

// src/server/db/repositories/PatrolRepository.ts
init_db();
var PatrolRepository = class {
  async findByTanodId(tanodId) {
    const result = await pool.query(
      "SELECT * FROM patrols WHERE tanod_id = $1",
      [tanodId]
    );
    return result.rows[0];
  }
  async getAllActive() {
    const result = await pool.query(`
      SELECT p.*, u.name as tanod_name, u.role
      FROM patrols p
      JOIN users u ON p.tanod_id = u.id
      WHERE p.is_active = true
        AND p.last_ping > NOW() - INTERVAL '30 minutes'
      ORDER BY p.last_ping DESC
    `);
    return result.rows;
  }
  async updatePatrol(data) {
    const result = await pool.query(
      `INSERT INTO patrols (tanod_id, tanod_name, is_active, location, last_ping, assigned_incident_id, status)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6)
       ON CONFLICT (tanod_id) DO UPDATE
       SET location = $4,
           last_ping = NOW(),
           is_active = $3,
           assigned_incident_id = $5,
           status = $6
       RETURNING *`,
      [
        data.tanod_id,
        data.tanod_name,
        data.is_active,
        data.location ? JSON.stringify(data.location) : null,
        data.assigned_incident_id,
        data.status || "available"
      ]
    );
    return result.rows[0];
  }
  async assignToIncident(tanodId, incidentId) {
    const result = await pool.query(
      `UPDATE patrols
       SET assigned_incident_id = $1, status = 'on-duty'
       WHERE tanod_id = $2 RETURNING *`,
      [incidentId, tanodId]
    );
    return result.rows[0];
  }
  async markAvailable(tanodId) {
    await pool.query(
      `UPDATE patrols
       SET assigned_incident_id = NULL, status = 'available'
       WHERE tanod_id = $1`,
      [tanodId]
    );
  }
};
var patrolRepository = new PatrolRepository();

// src/server/db/repositories/NotificationRepository.ts
init_db();
var NotificationRepository = class {
  async create(notification) {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, incident_id, read)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        notification.user_id,
        notification.type,
        notification.title,
        notification.message,
        notification.incident_id,
        notification.read || false
      ]
    );
    logger.info(`Notification sent to user ${notification.user_id}`);
    return result.rows[0];
  }
  async getByUserId(userId, limit = 20) {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }
  async markAsRead(notificationId) {
    await pool.query(
      "UPDATE notifications SET read = true WHERE id = $1",
      [notificationId]
    );
  }
  async markAllAsRead(userId) {
    await pool.query(
      "UPDATE notifications SET read = true WHERE user_id = $1",
      [userId]
    );
  }
};
var notificationRepository = new NotificationRepository();

// src/server/db/repositories/ReportRepository.ts
init_db();
var ReportRepository = class {
  async getIncidentStats(startDate, endDate) {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_incidents,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN type = 'CRIME' THEN 1 END) as crime_count,
        COUNT(CASE WHEN type = 'MEDICAL' THEN 1 END) as medical_count
      FROM incidents
      WHERE created_at BETWEEN $1 AND $2
    `, [startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3), endDate || /* @__PURE__ */ new Date()]);
    return result.rows[0];
  }
  async getResponseTimeAverage() {
    const result = await pool.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_response_time_seconds
      FROM incidents
      WHERE status = 'resolved'
    `);
    return result.rows[0];
  }
  async getIncidentsByBarangay(barangay, limit = 50) {
    const result = await pool.query(
      "SELECT * FROM incidents WHERE barangay = $1 ORDER BY created_at DESC LIMIT $2",
      [barangay, limit]
    );
    return result.rows;
  }
};
var reportRepository = new ReportRepository();

// src/server/db/repositories/ShiftRepository.ts
init_db();
init_schema();
var import_drizzle_orm2 = require("drizzle-orm");
var ShiftRepository = class {
  static async getAll() {
    const results = await db.select().from(shifts).orderBy((0, import_drizzle_orm2.desc)(shifts.createdAt)).limit(100);
    return results.map((s) => ({
      id: s.id,
      tanodId: s.tanodId,
      tanodName: s.tanodName,
      startTime: s.startTime?.toISOString(),
      endTime: s.endTime?.toISOString(),
      sector: s.sector,
      status: s.status,
      tanodResponse: s.tanodResponse,
      notes: s.notes,
      createdAt: s.createdAt?.toISOString()
    }));
  }
  static async getById(id) {
    const [result] = await db.select().from(shifts).where((0, import_drizzle_orm2.eq)(shifts.id, id));
    if (!result) return null;
    return {
      id: result.id,
      tanodId: result.tanodId,
      tanodName: result.tanodName,
      startTime: result.startTime?.toISOString(),
      endTime: result.endTime?.toISOString(),
      sector: result.sector,
      status: result.status,
      tanodResponse: result.tanodResponse,
      notes: result.notes,
      createdAt: result.createdAt?.toISOString()
    };
  }
  static async create(data) {
    await db.insert(shifts).values({
      tanodId: data.tanodId,
      tanodName: data.tanodName,
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
      sector: data.sector,
      status: data.status || "scheduled",
      tanodResponse: data.tanodResponse || "pending",
      notes: data.notes || null,
      createdAt: /* @__PURE__ */ new Date()
    });
  }
  static async update(id, data) {
    const updateData = {};
    if (data.status) updateData.status = data.status;
    if (data.tanodResponse) updateData.tanodResponse = data.tanodResponse;
    if (data.notes !== void 0) updateData.notes = data.notes;
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);
    if (data.sector) updateData.sector = data.sector;
    if (data.tanodId) updateData.tanodId = data.tanodId;
    if (data.tanodName) updateData.tanodName = data.tanodName;
    await db.update(shifts).set(updateData).where((0, import_drizzle_orm2.eq)(shifts.id, id));
  }
  static async delete(id) {
    await db.delete(shifts).where((0, import_drizzle_orm2.eq)(shifts.id, id));
  }
};

// src/server/db/repositories/BaseRepository.ts
init_db();
init_error();
var import_firestore = require("firebase-admin/firestore");
var BaseRepository = class {
  collectionName;
  constructor(collectionName) {
    this.collectionName = collectionName;
  }
  getCollection() {
    return getDb().collection(this.collectionName);
  }
  async create(data) {
    try {
      const now = import_firestore.Timestamp.now();
      const docRef = await this.getCollection().add({
        ...data,
        createdAt: now,
        updatedAt: now
      });
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() };
    } catch (error2) {
      console.error(`[Repository] Create failed in ${this.collectionName}`, error2);
      throw new AppError("Failed to create record", 500, "DB_CREATE_ERROR");
    }
  }
  async getById(id) {
    try {
      const doc = await this.getCollection().doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error2) {
      throw new AppError("Failed to fetch record", 500, "DB_READ_ERROR");
    }
  }
  async update(id, data) {
    try {
      const docRef = this.getCollection().doc(id);
      await docRef.update({
        ...data,
        updatedAt: import_firestore.Timestamp.now()
      });
      const updatedDoc = await docRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error2) {
      throw new AppError("Failed to update record", 500, "DB_UPDATE_ERROR");
    }
  }
  async delete(id) {
    try {
      await this.getCollection().doc(id).delete();
      return true;
    } catch (error2) {
      throw new AppError("Failed to delete record", 500, "DB_DELETE_ERROR");
    }
  }
};

// src/server/db/repositories/AuthRepository.ts
var AuthRepository = class extends BaseRepository {
  constructor() {
    super("users");
  }
  async findByEmail(email) {
    const snapshot = await this.getCollection().where("email", "==", email).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  async findByRole(role, limit = 50) {
    const snapshot = await this.getCollection().where("role", "==", role).orderBy("createdAt", "desc").limit(limit).get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
  }
  async updateLastActive(id) {
    return this.update(id, { lastActive: /* @__PURE__ */ new Date() });
  }
  async updateStatus(id, status) {
    return this.update(id, { status });
  }
};
var authRepository = new AuthRepository();

// src/server/db/repositories/BarangayRepository.ts
var BarangayRepository = class extends BaseRepository {
  constructor() {
    super("barangays");
  }
  async findByCode(code) {
    const snapshot = await this.getCollection().where("code", "==", code).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  async findAllActive() {
    const snapshot = await this.getCollection().where("isActive", "==", true).orderBy("name").get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
  }
  async getStats(barangayId) {
    const incidentsSnapshot = await this.getCollection().doc(barangayId).collection("incidents").count().get();
    return {
      totalIncidents: incidentsSnapshot.data().count || 0
      // Add more stats as needed
    };
  }
};
var barangayRepository = new BarangayRepository();

// src/server/services/aiService.ts
var import_genai = require("@google/genai");
var import_zod3 = require("zod");

// src/server/config/aiModels.ts
var AI_MODELS = {
  flash: {
    name: "models/gemini-flash-lite-latest",
    tier: "flash",
    description: "Fast, lightweight \u2014 for routine triage and low-severity incidents",
    maxOutputTokens: 1024,
    timeoutMs: 15e3
  },
  pro: {
    name: "models/gemini-flash-lite-latest",
    tier: "pro",
    description: "Balanced \u2014 for moderate incidents needing deeper analysis",
    maxOutputTokens: 2048,
    timeoutMs: 2e4
  },
  critical: {
    name: "models/gemini-flash-lite-latest",
    tier: "critical",
    description: "Maximum reasoning \u2014 for life-threatening emergencies",
    maxOutputTokens: 4096,
    timeoutMs: 3e4
  }
};
function routeToModel(hint) {
  const { incidentType, severityScore, urgency, descriptionLength = 0 } = hint;
  if (urgency === "CRITICAL" || severityScore !== void 0 && severityScore >= 8 || incidentType === "MEDICAL" || incidentType === "FIRE") {
    return AI_MODELS.critical;
  }
  if (urgency === "HIGH" || severityScore !== void 0 && severityScore >= 5 || incidentType === "CRIME" || incidentType === "NATURAL_DISASTER" || descriptionLength > 300) {
    return AI_MODELS.pro;
  }
  return AI_MODELS.flash;
}
function shouldUpgradeModel(usedTier, resultSeverity, resultUrgency) {
  if (usedTier === "critical") return null;
  const needsUpgrade = resultSeverity >= 8 || resultUrgency === "CRITICAL" || usedTier === "flash" && resultSeverity >= 5;
  if (needsUpgrade) {
    const upgradeTo = resultSeverity >= 8 ? "critical" : "pro";
    if (upgradeTo !== usedTier) {
      return AI_MODELS[upgradeTo];
    }
  }
  return null;
}

// src/server/services/aiService.ts
var ai = null;
function getAIClient() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY_NEW || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY_NEW or GEMINI_API_KEY (Free Tier) is required for server-side AI");
    }
    ai = new import_genai.GoogleGenAI({ apiKey: key });
  }
  return ai;
}
var AIAnalysisSchema = import_zod3.z.object({
  incidentType: import_zod3.z.enum(["MEDICAL", "FIRE", "CRIME", "DISTURBANCE", "NATURAL_DISASTER", "OTHER"]),
  severityScore: import_zod3.z.number().int().min(1).max(10),
  urgency: import_zod3.z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  summary: import_zod3.z.string().min(5).max(280),
  recommendedResponders: import_zod3.z.array(import_zod3.z.string()),
  riskFactors: import_zod3.z.array(import_zod3.z.string()),
  estimatedResponseTimeMins: import_zod3.z.number().int().min(1).max(60),
  actionRecommendations: import_zod3.z.array(import_zod3.z.string()),
  broadcastRecommendation: import_zod3.z.object({
    shouldBroadcast: import_zod3.z.boolean(),
    message: import_zod3.z.string().optional(),
    reason: import_zod3.z.string().optional()
  }).optional()
});
var log2 = {
  info: (msg, meta) => console.info(`[AI_SERVICE] ${msg}`, meta ? JSON.stringify(meta) : ""),
  error: (msg, meta) => console.error(`[AI_SERVICE] ${msg}`, meta ? JSON.stringify(meta) : ""),
  warn: (msg, meta) => console.warn(`[AI_SERVICE] ${msg}`, meta ? JSON.stringify(meta) : "")
};
function createFallbackAnalysis(description, initialType) {
  return {
    incidentType: initialType?.toUpperCase() || "OTHER",
    severityScore: 5,
    urgency: "HIGH",
    summary: description.length > 100 ? description.substring(0, 97) + "..." : description,
    recommendedResponders: ["Tanod Team"],
    riskFactors: ["AI analysis unavailable \u2014 manual assessment required"],
    estimatedResponseTimeMins: 15,
    actionRecommendations: [
      "Dispatch nearest available Tanod immediately",
      "Maintain communication with reporter",
      "Prepare for possible escalation"
    ]
  };
}
async function callModel(modelConfig, prompt, requestId) {
  const timeoutPromise = new Promise(
    (_, reject) => setTimeout(() => reject(new Error(`Model timeout after ${modelConfig.timeoutMs}ms`)), modelConfig.timeoutMs)
  );
  const callPromise = (async () => {
    const result = await getAIClient().models.generateContent({
      model: modelConfig.name,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: modelConfig.maxOutputTokens,
        temperature: 0.2
      }
    });
    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return AIAnalysisSchema.parse(parsed);
  })();
  return Promise.race([callPromise, timeoutPromise]);
}
async function analyzeIncident(description, initialType, nearestTanodDistanceKm, incidentId) {
  const requestId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const startTime = Date.now();
  if (!description?.trim()) {
    log2.warn("Empty description received", { requestId, incidentId });
    return { ...createFallbackAnalysis("No description provided", initialType), _modelUsed: "none", _tier: "flash" };
  }
  const sanitized = description.replace(/<[^>]*>/g, "").replace(/[^\w\s.,!?;:()\-'"]/g, "").substring(0, 1e3).trim();
  const prompt = buildPrompt(sanitized, initialType, nearestTanodDistanceKm);
  const initialModel = routeToModel({
    incidentType: initialType?.toUpperCase(),
    descriptionLength: sanitized.length
  });
  log2.info("Routing decision", {
    requestId,
    incidentId,
    selectedTier: initialModel.tier,
    selectedModel: initialModel.name,
    reason: `type=${initialType}, descLen=${sanitized.length}`
  });
  let result;
  let usedModel = initialModel;
  try {
    result = await callModel(initialModel, prompt, requestId);
    const upgrade = shouldUpgradeModel(initialModel.tier, result.severityScore, result.urgency);
    if (upgrade) {
      log2.warn("Upgrading model \u2014 initial result indicates higher severity than routed tier", {
        requestId,
        incidentId,
        from: initialModel.tier,
        to: upgrade.tier,
        severityScore: result.severityScore,
        urgency: result.urgency
      });
      try {
        const upgradedResult = await callModel(upgrade, prompt, requestId);
        result = upgradedResult;
        usedModel = upgrade;
      } catch (upgradeErr) {
        log2.warn("Upgrade model call failed, keeping initial result", {
          requestId,
          error: upgradeErr.message
        });
      }
    }
    log2.info("Analysis complete", {
      requestId,
      incidentId,
      model: usedModel.name,
      tier: usedModel.tier,
      severity: result.severityScore,
      urgency: result.urgency,
      durationMs: Date.now() - startTime
    });
    return { ...result, _modelUsed: usedModel.name, _tier: usedModel.tier };
  } catch (err) {
    log2.error("AI analysis failed", {
      requestId,
      incidentId,
      model: usedModel.name,
      error: err.message,
      durationMs: Date.now() - startTime
    });
    if (initialModel.tier !== "flash") {
      log2.warn("Primary model failed, falling back to flash", { requestId });
      try {
        const flashResult = await callModel(AI_MODELS.flash, prompt, requestId);
        return { ...flashResult, _modelUsed: AI_MODELS.flash.name, _tier: "flash" };
      } catch {
      }
    }
    return { ...createFallbackAnalysis(sanitized, initialType), _modelUsed: "fallback", _tier: "flash" };
  }
}
function buildPrompt(description, initialType, nearestTanodDistanceKm) {
  return `You are an expert AI emergency triage coordinator for a Philippine Barangay Tanod system (Brgy. Tanod S.O.S.).
Your primary task is to analyze incoming disaster, neighborhood security, medical, and public disturbance reports from residents.
Specifically, you must:
1. Carefully analyze the incident report to determine the most accurate incident type.
2. Evaluate the severity of the situation and assign a severity score from 1 (lowest) to 10 (highest), considering local context such as potential for escalation, danger to life, and resource demands.
3. Recommend appropriate, actionable responses.

Be proactive, authoritative, concise, and context-aware. Consider local factors typical in Philippine barangays such as narrow streets/accessibility, localized hazards (flooding, fires), and common neighborhood disputes.

Analyze this incident report and respond with ONLY a valid JSON object \u2014 no markdown, no explanation.

Incident Description: "${description}"
${initialType ? `Initial Type: ${initialType}` : ""}
${nearestTanodDistanceKm !== void 0 ? `Nearest Tanod Distance: ${nearestTanodDistanceKm.toFixed(2)} km` : ""}

Required JSON format:
{
  "incidentType": "MEDICAL" | "FIRE" | "CRIME" | "DISTURBANCE" | "NATURAL_DISASTER" | "OTHER",
  "severityScore": 1-10,
  "urgency": "LOW" | "NORMAL" | "HIGH" | "CRITICAL",
  "summary": "max 280 chars",
  "recommendedResponders": ["string"],
  "riskFactors": ["string"],
  "estimatedResponseTimeMins": 1-60,
  "actionRecommendations": ["string"],
  "broadcastRecommendation": {
    "shouldBroadcast": boolean,
    "message": "string",
    "reason": "string"
  }
}`;
}

// src/server/services/incidentService.ts
init_error();

// src/server/sockets/index.ts
var import_socket = require("socket.io");

// src/server/middleware/socketAuth.ts
var import_jsonwebtoken3 = __toESM(require("jsonwebtoken"), 1);
init_config();
var socketAuthMiddleware = (socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie || "";
  console.log(`[SocketAuth] Headers: ${JSON.stringify(socket.handshake.headers)}`);
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(";").forEach((c) => {
      const [key, val] = c.trim().split("=");
      cookies[key] = val;
    });
  }
  const cookieToken = cookies["token"];
  console.log(`[SocketAuth] Found cookie 'token': ${cookieToken ? "YES" : "NO"}`);
  console.log(`[SocketAuth] All cookies:`, Object.keys(cookies));
  let token = socket.handshake.auth.token || cookieToken || socket.handshake.headers.authorization?.split(" ")[1];
  if (token === "cookie-auth") {
    token = cookieToken;
  }
  if (!token) {
    console.warn(`[SocketAuth] Missing token for socket ${socket.id}. Headers:`, JSON.stringify(socket.handshake.headers));
    return next(new Error("Authentication required"));
  }
  try {
    const decoded = import_jsonwebtoken3.default.verify(token, config.jwtSecret);
    socket.data = {
      user: {
        id: decoded.id,
        role: decoded.role?.toUpperCase() || "CITIZEN",
        barangayId: decoded.barangayId || "default",
        name: decoded.name || decoded.email || "Anonymous",
        phone: decoded.phone
      }
    };
    console.log(`[SocketAuth] Authenticated user ${decoded.id} (${decoded.role}) for socket ${socket.id}`);
    next();
  } catch (err) {
    console.warn(`[SocketAuth] Authentication failed for socket ${socket.id}: ${err.message}`);
    next(new Error("Authentication error"));
  }
};

// src/server/services/voiceAssistantService.ts
var import_genai2 = require("@google/genai");
init_error();

// src/server/constants/index.ts
var SOCKET_EVENTS = {
  // Location
  LOCATION_UPDATE: "location_update",
  LOCATION_UPDATE_DELTA: "location_update_delta",
  LOCATION_REMOVE_DELTA: "location_remove_delta",
  // Incidents
  NEW_INCIDENT: "new_incident",
  INCIDENT_UPDATED: "incident_updated",
  INCIDENT_ASSIGNED: "incident_assigned",
  // SOS
  SOS_ALERT: "sos_alert",
  // Voice Assistant
  VOICE_RESPONSE: "VOICE_RESPONSE",
  JARVIS_ACTION_EXECUTED: "JARVIS_ACTION_EXECUTED",
  // General
  JOIN_INCIDENT_ROOM: "join_incident_room",
  LEAVE_INCIDENT_ROOM: "leave_incident_room"
};

// src/server/services/anomalyDetectionService.ts
var auditLogRepository2 = new AuditLogRepository();
var AnomalyDetectionService = class {
  profiles = /* @__PURE__ */ new Map();
  globalThreatIndicators = /* @__PURE__ */ new Set();
  async evaluateCommand(adminId, transcript, commandType = "GENERAL") {
    const profile = await this.getOrCreateProfile(adminId);
    const now = /* @__PURE__ */ new Date();
    profile.currentSession.commandCount++;
    profile.currentSession.actions.push({
      timestamp: now,
      command: transcript,
      type: commandType
    });
    let riskScore = 0;
    const hour = now.getHours();
    if (!profile.baseline.activeHours.includes(hour)) {
      riskScore += 25;
    }
    const commandsThisHour = this.countCommandsInWindow(profile, 60 * 60 * 1e3);
    if (commandsThisHour > profile.baseline.commandsPerHour * 2.5) {
      riskScore += 30;
    }
    const semanticRisk = this.detectSemanticAnomaly(transcript);
    riskScore += semanticRisk;
    const deviation = this.calculatePatternDeviation(profile, transcript);
    riskScore += deviation;
    if (profile.currentSession.commandCount > 25 && Date.now() - profile.currentSession.startTime.getTime() < 15 * 60 * 1e3) {
      riskScore += 20;
    }
    profile.riskScore = Math.min(100, riskScore);
    if (riskScore >= 70) {
      await this.triggerHighRiskResponse(adminId, transcript, riskScore);
    } else if (riskScore >= 40) {
      await this.triggerMediumRiskResponse(adminId, transcript, riskScore);
    }
    return { riskScore, profile };
  }
  async getOrCreateProfile(adminId) {
    if (!this.profiles.has(adminId)) {
      this.profiles.set(adminId, {
        adminId,
        baseline: {
          commandsPerHour: 12,
          avgCommandLength: 45,
          commonActions: ["check incidents", "dispatch", "status update"],
          activeHours: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
          typicalIncidentTypes: ["CRIME", "MEDICAL", "FIRE"]
        },
        currentSession: {
          commandCount: 0,
          startTime: /* @__PURE__ */ new Date(),
          actions: []
        },
        riskScore: 0
      });
    }
    return this.profiles.get(adminId);
  }
  detectSemanticAnomaly(text2) {
    const dangerousPatterns = [
      /ignore previous|new instructions|jailbreak|override/i,
      /delete all|remove|ban|shutdown|export data/i,
      /give me admin|full access|change password/i
    ];
    return dangerousPatterns.some((p) => p.test(text2)) ? 60 : 0;
  }
  calculatePatternDeviation(profile, transcript) {
    const lower = transcript.toLowerCase();
    const matchesCommon = profile.baseline.commonActions.some(
      (action) => lower.includes(action.toLowerCase())
    );
    return matchesCommon ? 0 : 15;
  }
  countCommandsInWindow(profile, ms) {
    const cutoff = Date.now() - ms;
    return profile.currentSession.actions.filter((a) => a.timestamp.getTime() > cutoff).length;
  }
  async triggerHighRiskResponse(adminId, command, score) {
    await auditLogRepository2.create({
      type: "ANOMALY_HIGH_RISK",
      citizen_id: adminId,
      notes: `Risk ${score}: ${command}`
    });
    getIO().to(`admin_${adminId}`).emit("voice-anomaly", {
      level: "HIGH",
      message: "Unusual activity detected. Please verify your identity or contact security.",
      command,
      riskScore: score
    });
    getIO().to(`admin_${adminId}`).emit("voice-pause", { reason: "anomaly" });
  }
  async triggerMediumRiskResponse(adminId, command, score) {
    getIO().to(`admin_${adminId}`).emit("voice-anomaly", {
      level: "MEDIUM",
      message: "Please confirm this command.",
      command,
      riskScore: score
    });
  }
};
var anomalyDetectionService = new AnomalyDetectionService();

// src/server/services/ttsService.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var ort = __toESM(require("onnxruntime-node"), 1);
var MODEL_DIR = import_path.default.resolve("src/server/models/supertonic");
var MODELS_AVAILABLE = import_fs.default.existsSync(MODEL_DIR);
var _session = null;
async function getSession() {
  if (!_session) {
    const modelPath = import_path.default.join(MODEL_DIR, "model.onnx");
    _session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ["cpu"],
      // CPU-only for server reliability
      graphOptimizationLevel: "all"
    });
  }
  return _session;
}
var TTSService = class {
  constructor() {
  }
  /**
   * Generates speech following a fallback priority chain:
   * 1. Google TTS (requires internet)
   * 2. Supertonic local inference (offline-capable)
   */
  async generateSpeech(options) {
    const { text: text2 } = options;
    if (!text2) throw new Error("Text is required for TTS");
    try {
      return await this.generateGoogleTTS(text2);
    } catch {
    }
    if (MODELS_AVAILABLE) {
      try {
        return await this.supertonicGenerate(text2);
      } catch (err) {
        console.warn("[TTS] Supertonic failed:", err);
      }
    }
    throw new Error("All TTS providers failed.");
  }
  async generateGoogleTTS(text2) {
    try {
      const googleTTS = await import("google-tts-api");
      const results = await googleTTS.getAllAudioBase64(text2, {
        lang: "tl",
        slow: false,
        host: "https://translate.google.com"
      });
      const buffers = results.map((r) => Buffer.from(r.base64, "base64"));
      return Buffer.concat(buffers);
    } catch (err) {
      console.error("Google TTS failed:", err);
      throw new Error("Google TTS provider failed.");
    }
  }
  /**
   * Supertonic ONNX inference
   * [ASSUMPTION]: Official supertone-inc/supertonic Node.js tokenization and decoding logic should be implemented here.
   */
  async supertonicGenerate(text2) {
    const session = await getSession();
    throw new Error("Implement using supertone-inc/supertonic js/node/ example");
  }
  async saveAudio(buffer, filename) {
    const dir = import_path.default.join(process.cwd(), "public/alerts");
    if (!import_fs.default.existsSync(dir)) import_fs.default.mkdirSync(dir, { recursive: true });
    const filePath = import_path.default.join(dir, filename);
    import_fs.default.writeFileSync(filePath, buffer);
    return `/alerts/${filename}`;
  }
};
var ttsService = new TTSService();

// src/server/services/voiceAssistantService.ts
init_config();
var aiClient = null;
function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY_NEW || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY_NEW or GEMINI_API_KEY (Free Tier) is required for voice assistant");
    }
    aiClient = new import_genai2.GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}
var SecureVoiceAssistantService = class {
  sessions = /* @__PURE__ */ new Map();
  commandHistory = /* @__PURE__ */ new Map();
  contextCache = /* @__PURE__ */ new Map();
  CONTEXT_CACHE_TTL = 8e3;
  // ── NO RUBY. NO SECRET WORDS. NO BACKDOORS. ──────────────────────────────
  // Role is set at socket connection from the verified JWT and never changes
  // mid-session via voice command. If you need to grant super admin, do it
  // through the admin panel with proper authentication.
  // ─────────────────────────────────────────────────────────────────────────
  auditLogRepo = new AuditLogRepository();
  incidentRepo = new IncidentRepository();
  tanodRepo = new TanodLocationRepository();
  auditQueue = [];
  auditFlushTimer;
  constructor() {
    setInterval(() => this.cleanup(), 5 * 60 * 1e3);
    console.log(`[JARVIS] AI Service initialized. Model: ${config.geminiModel || AI_MODELS.flash.name}. API Key present: ${!!(config.geminiApiKey || process.env.GEMINI_API_KEY)}`);
  }
  // ── SESSION & CONTEXT ────────────────────────────────────────────────────
  getOrCreateSession(userId, role) {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, {
        adminId: userId,
        permissionLevel: role,
        context: {
          activeIncidents: [],
          availableTanods: [],
          barangayInfo: { name: "", zoneCount: 0, pendingIncidents: 0, respondingIncidents: 0 }
        },
        language: "fil",
        lastActivity: /* @__PURE__ */ new Date(),
        isSuperAdmin: role === "superadmin" /* SUPER_ADMIN */
      });
    }
    const session = this.sessions.get(userId);
    session.lastActivity = /* @__PURE__ */ new Date();
    return session;
  }
  async getLiveContext(barangayId = "default") {
    const now = Date.now();
    const cached = this.contextCache.get(barangayId);
    if (cached && now - cached.timestamp < this.CONTEXT_CACHE_TTL) {
      return cached.data;
    }
    const [activeIncidents, availableTanods, counts] = await Promise.all([
      this.incidentRepo.findActiveByBarangay(barangayId),
      this.tanodRepo.getActiveTanods(),
      this.incidentRepo.getCountsByStatus()
    ]);
    const contextData = {
      activeIncidents: activeIncidents.slice(0, 15).map((i) => ({
        // Increased from 6
        id: i.id,
        type: i.type,
        location: typeof i.location === "string" ? i.location : `${i.latitude},${i.longitude}`,
        severity: i.status === "RESPONDING" ? "high" : "medium",
        reportedAt: i.createdAt
      })),
      availableTanods: availableTanods.slice(0, 20).map((t) => ({
        // Increased from 8
        id: t.tanod_id,
        name: t.tanod_name,
        status: "available",
        currentLocation: t.location
      })),
      barangayInfo: {
        name: "Barangay Command",
        zoneCount: 12,
        pendingIncidents: counts.pending,
        respondingIncidents: counts.responding
      }
    };
    this.contextCache.set(barangayId, { data: contextData, timestamp: now });
    return contextData;
  }
  // ── MAIN ENTRY POINT ─────────────────────────────────────────────────────
  async processVoiceInput(userId, input, currentRole) {
    const startTime = Date.now();
    const { transcript } = input;
    try {
      if (this.containsSuspiciousEscalation(transcript)) {
        await this.auditLogRepo.create({
          type: "SECURITY_VIOLATION",
          citizen_id: userId,
          notes: `Suspected privilege escalation attempt via voice: "${transcript.substring(0, 100)}"`
        });
        return this.buildErrorResponse(
          transcript,
          currentRole,
          "Command not recognized. Please use the dashboard for system access."
        );
      }
      this.enforceSecurity(userId, input, currentRole);
      const { riskScore } = await anomalyDetectionService.evaluateCommand(userId, transcript);
      if (riskScore >= 85) {
        return this.buildErrorResponse(
          transcript,
          currentRole,
          "Command blocked due to anomalous security patterns. Please verify your intent."
        );
      }
      const session = this.getOrCreateSession(userId, currentRole);
      const context = await this.getLiveContext();
      console.log(`[JARVIS] Calling Gemini for user ${userId} with transcript: "${transcript}"`);
      const result = await getAiClient().models.generateContent({
        model: config.geminiModel || AI_MODELS.flash.name,
        contents: [{ role: "user", parts: [{ text: transcript }] }],
        config: {
          systemInstruction: this.buildSystemPrompt(context, currentRole)
        }
      });
      console.log("[JARVIS] Gemini result received");
      const replyText = this.sanitizeAIResponse(result.text || "Paki-ulit, hindi ko naintindihan.");
      const proposedActions = this.extractProposedActions(replyText);
      this.queueAuditLog(userId, input.transcript, replyText, proposedActions);
      let audioBase64;
      try {
        const audioBuffer = await ttsService.generateSpeech({
          text: replyText,
          format: "mp3"
        });
        audioBase64 = audioBuffer.toString("base64");
      } catch (err) {
        console.error("[JARVIS] TTS generation failed:", err);
      }
      const response = {
        reply: replyText,
        transcript,
        proposedActions,
        permissionLevel: currentRole,
        isSuperAdmin: currentRole === "superadmin" /* SUPER_ADMIN */,
        tone: this.determineTone(proposedActions),
        confidence: 0.95,
        timestamp: /* @__PURE__ */ new Date()
      };
      if (audioBase64) {
        response.audioBase64 = audioBase64;
      }
      this.emitVoiceResponse(userId, response);
      console.log(`[JARVIS] Processed in ${Date.now() - startTime}ms`);
      return response;
    } catch (err) {
      console.error("[JARVIS] Process error:", err);
      const errResponse = this.buildErrorResponse(
        transcript,
        currentRole,
        err.status === 429 ? "Too many requests. Please wait." : "Guardian processing failed. Please try again."
      );
      this.emitVoiceResponse(userId, errResponse);
      return errResponse;
    }
  }
  // ── SECURITY HELPERS ─────────────────────────────────────────────────────
  /**
   * Detects known privilege escalation keywords in transcripts.
   * Any transcript trying to claim admin/super-admin via voice is flagged.
   */
  containsSuspiciousEscalation(transcript) {
    const upper = transcript.toUpperCase();
    const escalationPatterns = [
      "SUPER ADMIN",
      "SUPERADMIN",
      "FULL ACCESS",
      "FULL POWER",
      "UNLOCK ALL",
      "OVERRIDE",
      "BYPASS",
      "GRANT ADMIN",
      "ACTIVATE ADMIN",
      "SYSTEM OWNER",
      "RUBY"
      // Ensure RUBY is explicitly blocked
      // Add any other phrases that were previously used as backdoors
    ];
    return escalationPatterns.some((pattern) => upper.includes(pattern));
  }
  enforceSecurity(userId, input, role) {
    if (!this.hasPermission(role)) {
      throw new AppError(
        "Voice commands require Admin or Tanod access.",
        403,
        "FORBIDDEN"
      );
    }
    if (!this.checkRateLimit(userId)) {
      throw new AppError("Too many voice commands. Please wait.", 429, "RATE_LIMITED");
    }
  }
  hasPermission(role) {
    return [
      "resident" /* RESIDENT */,
      "admin" /* ADMIN */,
      "commander" /* COMMANDER */,
      "superadmin" /* SUPER_ADMIN */,
      "tanod" /* TANOD */
    ].includes(role);
  }
  checkRateLimit(userId) {
    const now = Date.now();
    let timestamps = this.commandHistory.get(userId) || [];
    timestamps = timestamps.filter((ts) => now - ts < 6e4);
    if (timestamps.length >= 15) return false;
    timestamps.push(now);
    this.commandHistory.set(userId, timestamps);
    return true;
  }
  // ── RESPONSE HELPERS ─────────────────────────────────────────────────────
  buildSystemPrompt(context, role) {
    return `ROLE: Brgy Tanod S.O.S. Emergency Coordinator (Guardian Mode).
CONTEXT: You are assisting citizens and responders in a potential emergency in the Philippines.
CURRENT ROLE: ${role}
UNITS AVAILABLE: ${context.availableTanods.length}
PENDING INCIDENTS: ${context.barangayInfo.pendingIncidents}
RESPONDING INCIDENTS: ${context.barangayInfo.respondingIncidents}

STRICT CONSTRAINTS:
- NEVER exceed 15 words per response.
- Use a calm, authoritative, and concise tone.
- CRITICAL: No medical diagnoses or legal advice.
- If danger is detected, prioritize immediate evacuation or responder arrival.
- Do NOT repeat yourself.
- Language: Match user's input (English or Filipino).`;
  }
  buildErrorResponse(transcript, role, message) {
    return {
      reply: message,
      transcript,
      proposedActions: [],
      permissionLevel: role,
      isSuperAdmin: false,
      tone: "authoritative" /* AUTHORITATIVE */,
      confidence: 1,
      timestamp: /* @__PURE__ */ new Date()
    };
  }
  sanitizeAIResponse(text2) {
    return text2.replace(/I will now execute|Executing now/gi, "Understood. Awaiting your confirmation.").trim();
  }
  determineTone(actions) {
    if (actions.some((a) => a.type === "EMERGENCY_DISPATCH" /* EMERGENCY_DISPATCH */)) {
      return "urgent" /* URGENT */;
    }
    return "authoritative" /* AUTHORITATIVE */;
  }
  extractProposedActions(text2) {
    const actions = [];
    const lower = text2.toLowerCase();
    if (lower.includes("dispatch") || lower.includes("ipadala") || lower.includes("patrol")) {
      actions.push({
        type: "EMERGENCY_DISPATCH" /* EMERGENCY_DISPATCH */,
        description: "Dispatch nearest Tanods to the reported location",
        confidence: 0.85,
        requiresConfirmation: true
      });
    }
    return actions;
  }
  emitVoiceResponse(userId, response) {
    getIO().to(`admin_${userId}`).emit(SOCKET_EVENTS.VOICE_RESPONSE, response);
    getIO().to(`user_${userId}`).emit("jarvis:reply", {
      text: response.reply,
      audioBase64: response.audioBase64
    });
  }
  // ── ACTION EXECUTION ─────────────────────────────────────────────────────
  async executeConfirmedAction(userId, action, userRole, _voiceSample) {
    if (!this.hasPermission(userRole)) {
      throw new AppError("Unauthorized to execute this action via JARVIS", 403, "FORBIDDEN");
    }
    if (this.isCriticalAction(action.type)) {
      const adminRoles = ["admin" /* ADMIN */, "superadmin" /* SUPER_ADMIN */, "commander" /* COMMANDER */];
      if (!adminRoles.includes(userRole)) {
        throw new AppError(
          "Admin role required for this action.",
          403,
          "INSUFFICIENT_ROLE"
        );
      }
    }
    console.log(`[JARVIS] Executing confirmed action: ${action.type} by ${userId}`);
    getIO().emit(SOCKET_EVENTS.JARVIS_ACTION_EXECUTED, { userId, action });
    await this.auditLogRepo.create({
      type: "JARVIS_ACTION_EXECUTED",
      citizen_id: userId,
      notes: `${userRole.toUpperCase()} executed: ${action.description}`
    });
  }
  isCriticalAction(actionType) {
    return [
      "EMERGENCY_DISPATCH" /* EMERGENCY_DISPATCH */,
      "INCIDENT_UPDATE" /* INCIDENT_UPDATE */,
      "BROADCAST_ALERT" /* BROADCAST_ALERT */
    ].includes(actionType);
  }
  // ── AUDIT & CLEANUP ─────────────────────────────────────────────────────
  queueAuditLog(userId, transcript, reply, actions) {
    this.auditQueue.push({
      type: "VOICE_COMMAND",
      citizen_id: userId,
      notes: `Transcript: ${transcript} | Reply: ${reply} | Actions: ${actions.length}`,
      timestamp: /* @__PURE__ */ new Date()
    });
    if (this.auditQueue.length > 10) {
      this.flushAuditQueue();
    } else if (!this.auditFlushTimer) {
      this.auditFlushTimer = setTimeout(() => this.flushAuditQueue(), 3e4);
    }
  }
  async flushAuditQueue() {
    if (this.auditQueue.length === 0) return;
    const batch = [...this.auditQueue];
    this.auditQueue = [];
    if (this.auditFlushTimer) {
      clearTimeout(this.auditFlushTimer);
      this.auditFlushTimer = void 0;
    }
    try {
      await Promise.all(batch.map((log3) => this.auditLogRepo.create(log3)));
    } catch (err) {
      console.error("[JARVIS] Audit flush error:", err);
    }
  }
  cleanup() {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > 15 * 60 * 1e3) {
        this.sessions.delete(userId);
      }
    }
    this.contextCache.clear();
  }
  async processAudioInput(userId, audioBuffer, currentRole, mimeType = "audio/webm") {
    const startTime = Date.now();
    try {
      if (!this.checkRateLimit(userId)) {
        throw new AppError("Too many voice commands. Please wait.", 429, "RATE_LIMITED");
      }
      const session = this.getOrCreateSession(userId, currentRole);
      const context = await this.getLiveContext();
      const result = await getAiClient().models.generateContent({
        model: config.geminiModel || AI_MODELS.flash.name,
        contents: [{ role: "user", parts: [
          { inlineData: { mimeType, data: audioBuffer.toString("base64") } }
        ] }],
        config: {
          systemInstruction: this.buildSystemPrompt(context, currentRole) + "\nListen to the audio and respond appropriately. If it's a command, identify it."
        }
      });
      const replyText = this.sanitizeAIResponse(result.text || "Audio received. Processing.");
      const proposedActions = this.extractProposedActions(replyText);
      this.queueAuditLog(userId, "[Audio Input]", replyText, proposedActions);
      let audioBase64;
      try {
        const audioRes = await ttsService.generateSpeech({
          text: replyText,
          format: "mp3"
        });
        audioBase64 = audioRes.toString("base64");
      } catch (err) {
        console.error("[JARVIS] TTS generation failed:", err);
      }
      const response = {
        reply: replyText,
        transcript: "[Audio processed by Gemini]",
        proposedActions,
        permissionLevel: currentRole,
        isSuperAdmin: currentRole === "superadmin" /* SUPER_ADMIN */,
        tone: this.determineTone(proposedActions),
        confidence: 0.9,
        timestamp: /* @__PURE__ */ new Date()
      };
      if (audioBase64) {
        response.audioBase64 = audioBase64;
      }
      this.emitVoiceResponse(userId, response);
      console.log(`[JARVIS] Multimodal audio processed in ${Date.now() - startTime}ms`);
      return response;
    } catch (err) {
      console.error("[JARVIS] Audio process error:", err);
      return this.buildErrorResponse(
        "[Audio Input]",
        currentRole,
        "Voice analysis failed. Please try again or use text."
      );
    }
  }
  shutdown() {
    this.flushAuditQueue();
    this.cleanup();
  }
};
var voiceAssistantService = new SecureVoiceAssistantService();

// src/server/sockets/index.ts
init_location_handler();

// src/server/sockets/handlers/incident.handler.ts
var import_zod4 = require("zod");
var io;
var createSosSchema = import_zod4.z.object({
  description: import_zod4.z.string().optional().default(""),
  latitude: import_zod4.z.number().min(-90).max(90),
  longitude: import_zod4.z.number().min(-180).max(180),
  initialType: import_zod4.z.string().optional(),
  photos: import_zod4.z.array(import_zod4.z.string()).optional(),
  voiceClip: import_zod4.z.string().optional(),
  clientUuid: import_zod4.z.string().uuid().optional()
});
var respondIncidentSchema = import_zod4.z.object({
  incidentId: import_zod4.z.string().min(1)
});
var setupIncidentHandlers = (socketIO, socket) => {
  io = socketIO;
  socket.on("create_sos", async (rawData) => {
    const user = socket.data.user;
    try {
      const data = createSosSchema.parse(rawData);
      const incident = await incidentService.createSOS({
        reporterId: user.id,
        barangayId: user.barangayId || "default",
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        initialType: data.initialType,
        photos: data.photos,
        voiceClip: data.voiceClip,
        clientUuid: data.clientUuid
      });
      socket.emit(SOCKET_EVENTS.SOS_ALERT, {
        success: true,
        incidentId: incident.id,
        aiAnalysis: incident.aiAnalysis
      });
      console.log(`[Socket] SOS Created by ${user.role} ${user.id} | Type: ${incident.aiAnalysis?.incidentType}`);
    } catch (error2) {
      console.error("[Socket] create_sos failed:", error2);
      const errorMessage = error2?.message || "Failed to process emergency report";
      socket.emit("sos_error", {
        success: false,
        error: errorMessage
      });
    }
  });
  socket.on("respond_to_incident", (rawData) => {
    const user = socket.data.user;
    try {
      const data = respondIncidentSchema.parse(rawData);
      io.to("responders").emit(SOCKET_EVENTS.INCIDENT_ASSIGNED, {
        incidentId: data.incidentId,
        responderId: user.id,
        responderName: user.name
      });
    } catch (error2) {
      console.error("[Socket] respond_to_incident validation failed:", error2);
    }
  });
  socket.on("join_incident_room", (incidentId) => {
    if (typeof incidentId === "string" && incidentId.length > 0) {
      socket.join(`incident_${incidentId}`);
    }
  });
};

// src/server/sockets/handlers/jarvis.handler.ts
init_config();
init_roleUtils();
var activeSessions = /* @__PURE__ */ new Map();
var MAX_AUDIO_BUFFER_BYTES = 5e5;
var MAX_TRANSCRIPT_LENGTH = 1e3;
function setupJarvisHandler(io3, socket) {
  const { id: userId, role: rawRole } = socket.data.user;
  const role = normalizeRole(rawRole);
  if (!isTanodOrAbove(role)) {
    console.log(`[JARVIS] Access denied for role: ${role} (socket ${socket.id})`);
    return;
  }
  socket.on("jarvis:start-session", async () => {
    if (activeSessions.has(socket.id)) {
      socket.emit("jarvis:session-open");
      return;
    }
    if (!config.geminiApiKey) {
      socket.emit("jarvis:error", {
        code: "AI_NOT_CONFIGURED",
        message: "AI assistant is not configured on this server."
      });
      return;
    }
    try {
      activeSessions.set(socket.id, {
        userId,
        role,
        openedAt: /* @__PURE__ */ new Date(),
        audioBuffer: [],
        totalBufferSize: 0
      });
      socket.emit("jarvis:session-open");
      console.log(`[JARVIS] Session opened for ${userId} (${role})`);
    } catch (err) {
      console.error("[JARVIS] Failed to open session:", err);
      socket.emit("jarvis:error", {
        code: "SESSION_FAILED",
        message: "Could not open AI session. Please try again."
      });
    }
  });
  socket.on("jarvis:audio-chunk", async (data) => {
    const session = activeSessions.get(socket.id);
    if (!session) {
      socket.emit("jarvis:error", {
        code: "NO_SESSION",
        message: "No active session. Please start a session first."
      });
      return;
    }
    try {
      const audioChunk = data.data;
      if (!Buffer.isBuffer(audioChunk)) {
        throw new Error("Expected binary buffer for audio chunk");
      }
      session.totalBufferSize = (session.totalBufferSize || 0) + audioChunk.length;
      if (session.totalBufferSize > MAX_AUDIO_BUFFER_BYTES) {
        session.audioBuffer = [];
        session.totalBufferSize = 0;
        socket.emit("jarvis:error", {
          code: "BUFFER_OVERFLOW",
          message: "Audio buffer exceeded limit. Please try again."
        });
        return;
      }
      session.audioBuffer.push(audioChunk);
      if (session.totalBufferSize > 32e3) {
        await processAudioBuffer(socket, session, userId, role);
      }
    } catch (err) {
      console.error("[JARVIS] Audio chunk error:", err);
    }
  });
  socket.on("jarvis:transcript", (data) => {
    if (!data?.text || typeof data.text !== "string") return;
    const trimmed = data.text.trim().substring(0, MAX_TRANSCRIPT_LENGTH);
    if (trimmed.length === 0) return;
    socket.emit("voice-command", { transcript: trimmed, language: "fil" });
  });
  socket.on("jarvis:end-session", () => {
    if (activeSessions.has(socket.id)) {
      activeSessions.delete(socket.id);
      socket.emit("jarvis:session-closed");
      console.log(`[JARVIS] Session closed for ${userId}`);
    }
  });
  socket.on("disconnect", () => {
    if (activeSessions.has(socket.id)) {
      activeSessions.delete(socket.id);
      console.log(`[JARVIS] Cleaned up session on disconnect for ${userId}`);
    }
  });
}
async function processAudioBuffer(socket, session, userId, role) {
  const audioChunks = session.audioBuffer;
  session.audioBuffer = [];
  session.totalBufferSize = 0;
  try {
    const combinedBuffer = Buffer.concat(audioChunks);
    const permissionLevel = role;
    const response = await voiceAssistantService.processAudioInput(
      userId,
      combinedBuffer,
      permissionLevel
    );
    socket.emit("jarvis:audio-received", {
      message: "Audio processed.",
      reply: response.reply
    });
  } catch (err) {
    console.error("[JARVIS] Audio processing failed:", err);
    socket.emit("jarvis:error", {
      code: "AUDIO_PROCESS_FAILED",
      message: err.message || "Failed to process voice command."
    });
  }
}

// src/server/sockets/handlers/guardian.handler.ts
init_location_handler();
function setupGuardianHandler(io3, socket) {
  const user = socket.data.user;
  socket.on("guardian:priority_spike", async (data) => {
    try {
      console.log(`[GUARDIAN] Priority spike from ${user.id}: ${data.type} (${data.level})`);
      const locations = getActiveLocations();
      const userLoc = locations.find((l) => l.user_id === user.id);
      const lat = userLoc?.lat || 14.5995;
      const lng = userLoc?.lng || 120.9842;
      const incident = await incidentService.createSOS({
        reporterId: user.id,
        barangayId: user.barangayId || "default",
        description: `[AI GUARDIAN AUTOMATIC ALERT] ${data.transcript}`,
        latitude: lat,
        longitude: lng,
        initialType: data.type
      });
      socket.emit("guardian:ack", {
        status: "EMERGENCY_REPORTED",
        incidentId: incident.id
      });
    } catch (err) {
      console.error("[GUARDIAN] Spike processing failed:", err);
    }
  });
  socket.on("guardian:live_transcript", (data) => {
    io3.to("responders").to(`barangay_${user.barangayId}`).emit("guardian:monitor_transcript", {
      userId: user.id,
      userName: user.name,
      transcript: data.transcript,
      isFinal: data.isFinal,
      timestamp: /* @__PURE__ */ new Date()
    });
  });
  socket.on("guardian:status_update", (status) => {
    console.log(`[GUARDIAN] User ${user.id} status: ${status}`);
  });
}

// src/server/sockets/index.ts
init_config();
init_roleUtils();
var io2;
var VOICE_RATE_LIMIT = 10;
var VOICE_RATE_WINDOW = 6e4;
var voiceRateLimits = /* @__PURE__ */ new Map();
function isVoiceAllowed(userId) {
  const now = Date.now();
  const cutoff = now - VOICE_RATE_WINDOW;
  let timestamps = voiceRateLimits.get(userId) || [];
  timestamps = timestamps.filter((ts) => ts > cutoff);
  if (timestamps.length >= VOICE_RATE_LIMIT) return false;
  timestamps.push(now);
  voiceRateLimits.set(userId, timestamps);
  return true;
}
function initSocket(server) {
  console.log("[Socket] Initializing Socket.IO with server...");
  try {
    io2 = new import_socket.Server(server, {
      path: "/socket.io/",
      pingTimeout: 6e4,
      pingInterval: 1e4,
      transports: ["polling", "websocket"],
      connectTimeout: 45e3,
      maxHttpBufferSize: 1e7,
      // 10MB for voice packets
      cookie: false,
      cors: {
        origin: (origin, callback) => {
          const allowedOrigins2 = config.corsOrigin ? config.corsOrigin.split(",").map((o) => o.trim()) : [];
          const isStudioPreview = origin && (origin.endsWith(".run.app") || origin.startsWith("http://localhost:3000"));
          const isDevFallback = allowedOrigins2.length === 0 && config.nodeEnv !== "production";
          if (config.nodeEnv !== "production" || !origin || origin === "null" || isStudioPreview || isDevFallback || origin && allowedOrigins2.includes(origin)) {
            return callback(null, true);
          }
          console.warn(`[Socket CORS] Origin rejected: ${origin}. IsStudio: ${isStudioPreview}, DevFallback: ${isDevFallback}, Allowed: ${JSON.stringify(allowedOrigins2)}`);
          return callback(null, false);
        },
        credentials: true,
        methods: ["GET", "POST", "OPTIONS"]
      }
    });
    console.log("[Socket] Server instance created.");
  } catch (err) {
    console.error("[Socket] FAILED to create Server instance:", err);
    throw err;
  }
  io2.use((socket, next) => {
    console.log(`[Socket] New connection attempt: ${socket.id} from ${socket.handshake.address}`);
    socketAuthMiddleware(socket, next);
  });
  io2.on("connection", (socket) => {
    const { id, role: rawRole, barangayId } = socket.data.user;
    const role = normalizeRole(rawRole);
    console.log(`[Socket] Connected \u2192 ${role} ${id} | Barangay: ${barangayId}`);
    socket.join(`user_${id}`);
    if (isTanodOrAbove(role)) {
      socket.join("responders");
      socket.join(`barangay_${barangayId}`);
      if (isAdminOrAbove(role)) {
        socket.join(`admin_${id}`);
      }
    } else {
      socket.join(`citizen_${id}`);
      socket.join(`barangay_${barangayId}`);
    }
    setupLocationHandlers(io2, socket);
    setupIncidentHandlers(io2, socket);
    setupJarvisHandler(io2, socket);
    setupGuardianHandler(io2, socket);
    const getPermissionLevel = (r) => {
      const normalized = normalizeRole(r);
      if (normalized === "admin" || normalized === "captain" || normalized === "superadmin") {
        return "admin" /* ADMIN */;
      }
      if (normalized === "tanod") return "tanod" /* TANOD */;
      return "resident" /* RESIDENT */;
    };
    socket.on("voice-command", async (data, callback) => {
      if (!data || typeof data.transcript !== "string" || data.transcript.trim().length === 0) {
        const error2 = {
          message: "Invalid voice command payload.",
          code: "INVALID_INPUT"
        };
        socket.emit("voice-error", error2);
        if (callback) callback({ success: false, error: error2 });
        return;
      }
      if (data.transcript.length > 1e3) {
        const error2 = {
          message: "Voice command too long. Please keep commands under 1000 characters.",
          code: "INPUT_TOO_LONG"
        };
        socket.emit("voice-error", error2);
        if (callback) callback({ success: false, error: error2 });
        return;
      }
      if (!isVoiceAllowed(id)) {
        const error2 = {
          message: "Too many voice commands. Please wait before trying again.",
          code: "RATE_LIMITED"
        };
        socket.emit("voice-error", error2);
        if (callback) callback({ success: false, error: error2 });
        return;
      }
      try {
        const response = await voiceAssistantService.processVoiceInput(
          id,
          {
            transcript: data.transcript.trim(),
            language: data.language || "fil"
          },
          getPermissionLevel(role)
        );
        if (callback) callback({ success: true, data: response });
      } catch (error2) {
        const errPayload = {
          message: error2.message,
          code: error2.code || "VOICE_PERMISSION_ERROR"
        };
        socket.emit("voice-error", errPayload);
        if (callback) callback({ success: false, error: errPayload });
      }
    });
    socket.on("confirm-action", async (data) => {
      if (!isVoiceAllowed(id)) {
        socket.emit("voice-error", {
          message: "Too many voice commands. Please wait before trying again.",
          code: "RATE_LIMITED"
        });
        return;
      }
      try {
        const audioBuffer = data.voiceSample ? Buffer.from(data.voiceSample) : void 0;
        await voiceAssistantService.executeConfirmedAction(
          id,
          data.action,
          getPermissionLevel(role),
          audioBuffer
        );
      } catch (e) {
        console.error(e);
        socket.emit("voice-error", {
          message: e.message,
          code: e.code || "ACTION_FAILED"
        });
      }
    });
    socket.on("ping", () => socket.emit("pong"));
    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected \u2192 ${role} ${id} | Reason: ${reason}`);
    });
  });
  startLocationExpiryTask(io2);
  console.log("[Socket] Socket.IO initialized successfully");
  return io2;
}
function getIO() {
  if (!io2) throw new Error("Socket.IO not initialized");
  return io2;
}
function emitToAll(event, data) {
  if (io2) io2.emit(event, data);
}
function emitToRoom(room, event, data) {
  io2?.to(room).emit(event, data);
}

// src/server/services/incidentService.ts
init_db();
var incidentRepository = new IncidentRepository();
var recentSOS = /* @__PURE__ */ new Map();
var processedUuids = /* @__PURE__ */ new Set();
var incidentService = {
  async createSOS(data) {
    const { reporterId, barangayId, description, latitude, longitude, clientUuid } = data;
    if (clientUuid) {
      if (processedUuids.has(clientUuid)) {
        console.log(`[SOS] Duplicate report ignored: ${clientUuid}`);
        throw new AppError("Duplicate report already processed", 200, "DUPLICATE");
      }
      processedUuids.add(clientUuid);
      setTimeout(() => processedUuids.delete(clientUuid), 36e5);
    }
    const lastSOS = recentSOS.get(reporterId);
    if (lastSOS && Date.now() - lastSOS < 5e3) {
      throw new AppError("System busy. Please wait 5 seconds before another transmission.", 429, "RATE_LIMITED");
    }
    recentSOS.set(reporterId, Date.now());
    let nearestTanodDistanceKm = 1.2;
    try {
      const nearestData = await this.findNearestResponders(barangayId, latitude, longitude, 1);
      if (nearestData && nearestData.length > 0) {
        nearestTanodDistanceKm = nearestData[0].distance_metres / 1e3;
      }
    } catch (e) {
      console.warn("[SOS] Could not calculate nearest responder distance", e);
    }
    const aiAnalysis = await analyzeIncident(
      description,
      data.initialType,
      nearestTanodDistanceKm,
      `inc_${Date.now()}`
    );
    const userTypes = ["FIRE", "MEDICAL", "CRIME", "NATURAL_DISASTER"];
    const finalType = data.initialType && userTypes.includes(data.initialType.toUpperCase()) ? data.initialType.toUpperCase() : aiAnalysis.incidentType || data.initialType || "OTHER";
    const incidentData = {
      reporterId,
      barangayId,
      type: finalType,
      description: description || "",
      latitude,
      longitude,
      status: "PENDING",
      aiAnalysis,
      photos: data.photos || [],
      voiceClip: data.voiceClip
    };
    const incident = await incidentRepository.create(incidentData);
    if (aiAnalysis.broadcastRecommendation?.shouldBroadcast) {
      try {
        await pool.query(
          "INSERT INTO system_broadcasts (incident_id, message, type, approval_status, ai_recommendation) VALUES ($1, $2, $3, 'pending', $4)",
          [incident.id, aiAnalysis.broadcastRecommendation.message, "emergency", JSON.stringify(aiAnalysis.broadcastRecommendation)]
        );
      } catch (e) {
        console.error("Failed to create automated broadcast recommendation", e);
      }
    }
    let residentName = "Resident";
    try {
      const userRes = await pool.query("SELECT name FROM users WHERE id = $1", [reporterId]);
      if (userRes.rows.length > 0) {
        residentName = userRes.rows[0].name;
      }
    } catch (e) {
      console.warn("Could not fetch resident name for realtime broadcast", e);
    }
    if (getIO()) {
      const formattedAlert = {
        id: incident.id,
        resident_id: incident.reporterId,
        residentName,
        type: incident.type,
        status: incident.status,
        description: incident.description,
        location: incident.location,
        aiAnalysis: incident.aiAnalysis,
        created_at: incident.createdAt || (/* @__PURE__ */ new Date()).toISOString()
      };
      getIO().to("responders").emit("alert_new", { alert: formattedAlert });
      getIO().to(`incident_${incident.id}`).emit("alert_new", { alert: formattedAlert });
      getIO().to(`user_${incident.reporterId}`).emit("alert_new", { alert: formattedAlert });
      if (barangayId && barangayId !== "default") {
        getIO().to(`barangay_${barangayId}`).emit("alert_new", { alert: formattedAlert });
      }
    }
    return incident;
  },
  async cancelSOS(incidentId, userId, userRole) {
    const alertCheck = await pool.query(
      "SELECT resident_id, status FROM alerts WHERE id = $1",
      [incidentId]
    );
    if (alertCheck.rows.length === 0) {
      throw new AppError("Alert not found", 404, "NOT_FOUND");
    }
    const alert = alertCheck.rows[0];
    if (alert.resident_id !== userId && userRole !== "ADMIN" && userRole !== "CAPTAIN" && userRole !== "admin" && userRole !== "superadmin") {
      throw new AppError("Permission denied", 403, "FORBIDDEN");
    }
    if (alert.status === "resolved" || alert.status === "cancelled") {
      throw new AppError("Alert is already completed", 409, "CONFLICT");
    }
    const result = await pool.query(
      "UPDATE alerts SET status = 'cancelled', updated_at = now() WHERE id = $1 RETURNING *",
      [incidentId]
    );
    const updated = {
      id: incidentId,
      status: "CANCELLED",
      updatedAt: result.rows[0].updated_at
    };
    if (getIO()) {
      getIO().to(`incident_${incidentId}`).emit("alert_update", { type: "update", alert: updated });
      getIO().to("responders").emit("alert_update", { type: "update", alert: updated });
      getIO().to(`user_${alert.resident_id}`).emit("alert_update", { type: "update", alert: updated });
    }
    return updated;
  },
  async getActiveIncidents(barangayId) {
    return await incidentRepository.findActiveByBarangay(barangayId || "default");
  },
  async getActiveAlerts() {
    const result = await pool.query(
      `SELECT a.*, u.name as "residentName" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.status IN ('pending', 'active', 'responding') ORDER BY a.created_at DESC`
    );
    return result.rows.map((a) => ({
      ...a,
      location: typeof a.location === "string" ? JSON.parse(a.location) : a.location,
      timestamp: a.created_at
    }));
  },
  async findNearestResponders(barangayId, latitude, longitude, limit = 5) {
    const { haversineDistance: haversineDistance2 } = await Promise.resolve().then(() => (init_geo(), geo_exports));
    const { getActiveLocations: getActiveLocations2 } = await Promise.resolve().then(() => (init_location_handler(), location_handler_exports));
    const activeLocations2 = getActiveLocations2();
    const responders = [];
    for (const loc of activeLocations2) {
      if (loc.role !== "TANOD" && loc.role !== "tanod" && loc.role !== "ADMIN" && loc.role !== "CAPTAIN" && loc.role !== "superadmin") continue;
      if (typeof loc.lat !== "number" || typeof loc.lng !== "number") continue;
      const d = haversineDistance2({ lat: latitude, lng: longitude }, loc);
      responders.push({
        ...loc,
        distance_metres: Math.round(d)
      });
    }
    responders.sort((a, b) => a.distance_metres - b.distance_metres);
    return responders.slice(0, limit);
  },
  async findNearest(lat, lng) {
    const responders = await this.findNearestResponders("default", lat, lng, 1);
    const { getActiveLocations: getActiveLocations2 } = await Promise.resolve().then(() => (init_location_handler(), location_handler_exports));
    const activeLocations2 = getActiveLocations2();
    return {
      nearest_tanod: responders.length > 0 ? responders[0] : null,
      active_tanods: activeLocations2.filter((l) => l.role === "TANOD" || l.role === "tanod").length
    };
  }
};

// src/server/controllers/sosController.ts
init_error();
var createSOS = async (req, res) => {
  const {
    description,
    latitude,
    longitude,
    initialType,
    photos,
    voiceClip,
    type,
    location,
    severity,
    clientUuid
    // Added for deduplication
  } = req.body;
  const user = req.user;
  const lat = latitude ?? location?.lat;
  const lng = longitude ?? location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new AppError("Valid latitude and longitude are required", 400, "BAD_REQUEST");
  }
  try {
    const incident = await incidentService.createSOS({
      reporterId: user.id,
      barangayId: user.barangayId || "default",
      description: description?.trim() || "",
      latitude: lat,
      longitude: lng,
      initialType: initialType || type,
      photos,
      voiceClip,
      clientUuid
    });
    return res.status(201).json(
      ApiResponse.success(incident, "SOS alert successfully created")
    );
  } catch (error2) {
    console.error("[SOS Controller] Create failed:", error2);
    throw error2;
  }
};
var cancelSOS = async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const updatedIncident = await incidentService.cancelSOS(id, user.id, user.role);
  return res.json(
    ApiResponse.success(updatedIncident, "SOS alert cancelled")
  );
};
var getActiveAlerts = async (req, res) => {
  const activeAlerts = await incidentService.getActiveAlerts();
  return res.json(
    ApiResponse.success(activeAlerts, "Active alerts retrieved successfully")
  );
};
var findNearest = async (req, res) => {
  const { lat, lng } = req.body ?? {};
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new AppError("lat and lng must be numbers", 400, "BAD_REQUEST");
  }
  const nearestData = await incidentService.findNearest(lat, lng);
  return res.json(
    ApiResponse.success(nearestData, "Nearest tanod retrieved successfully")
  );
};

// src/server/middleware/rateLimiter.ts
var import_express_rate_limit = require("express-rate-limit");
var globalLimiter = (0, import_express_rate_limit.rateLimit)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  limit: 500,
  // Tightened from 1000
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health",
  // health checks don't count
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Too many requests. Please slow down." }
  }
});
var authLimiter = (0, import_express_rate_limit.rateLimit)({
  windowMs: 15 * 60 * 1e3,
  limit: 20,
  // 20 login/register attempts per 15 minutes
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many login attempts. Please try again in 15 minutes."
    }
  }
});
var sosLimiter = (0, import_express_rate_limit.rateLimit)({
  windowMs: 1 * 60 * 1e3,
  limit: 5,
  // 5 SOS per minute per IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many SOS requests. Please use the active alert chat."
    }
  }
});
var sosRateLimiter = sosLimiter;
var strictRateLimiter = (0, import_express_rate_limit.rateLimit)({
  windowMs: 5 * 60 * 1e3,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later."
    }
  }
});

// src/server/routes/sosRoutes.ts
var router2 = (0, import_express2.Router)();
router2.post(
  "/alert",
  authenticate,
  sosRateLimiter,
  createSOS
);
router2.post(
  "/alert/:id/cancel",
  authenticate,
  cancelSOS
);
router2.get(
  "/active",
  authenticate,
  getActiveAlerts
);
router2.post(
  "/nearest",
  authenticate,
  strictRateLimiter,
  findNearest
);
var sosRoutes_default = router2;

// src/server/routes/analyticsRoutes.ts
var import_express3 = require("express");

// src/server/controllers/analyticsController.ts
init_db();
init_response();
var getDashboardAnalytics = async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== "admin" && userRole !== "superadmin" && userRole !== "tanod") {
      return error(res, "Administrative clearance required", "FORBIDDEN", 403);
    }
    const overviewPromise = pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'resident' AND status = 'approved') as verified_residents,
        (SELECT COUNT(*) FROM users WHERE role = 'tanod') as total_tanods,
        (SELECT COUNT(*) FROM alerts WHERE status IN ('pending', 'active', 'responding')) as active_alerts
    `).catch((err) => {
      console.error("Analytics Overview Query Error:", err);
      return { rows: [{ verified_residents: 0, total_tanods: 0, active_alerts: 0 }] };
    });
    const byTypePromise = pool.query(`
      SELECT type, COUNT(*) as count
      FROM alerts
      GROUP BY type
      ORDER BY count DESC
    `).catch((err) => {
      console.error("Analytics ByType Query Error:", err);
      return { rows: [] };
    });
    const historyPromise = pool.query(`
      SELECT
        DATE(created_at) as day,
        COUNT(*) as count
      FROM alerts
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY day
      ORDER BY day ASC
    `).catch((err) => {
      console.error("Analytics History Query Error:", err);
      return { rows: [] };
    });
    const [overviewRes, byTypeRes, historyRes] = await Promise.all([
      overviewPromise,
      byTypePromise,
      historyPromise
    ]);
    return success(res, {
      overview: {
        verified_residents: parseInt(overviewRes.rows[0]?.verified_residents || "0"),
        total_tanods: parseInt(overviewRes.rows[0]?.total_tanods || "0"),
        active_alerts: parseInt(overviewRes.rows[0]?.active_alerts || "0")
      },
      alertsByType: byTypeRes.rows.map((r) => ({ ...r, count: parseInt(r.count || "0") })),
      alertsHistory: historyRes.rows.map((r) => ({ ...r, count: parseInt(r.count || "0") }))
    });
  } catch (err) {
    console.error("Analytics Dashboard Error:", err);
    return error(res, err.message);
  }
};

// src/server/routes/analyticsRoutes.ts
var router3 = (0, import_express3.Router)();
router3.get("/dashboard", authenticate, authorize(["admin", "superadmin", "tanod"]), getDashboardAnalytics);
var analyticsRoutes_default = router3;

// src/server/routes/syncRoutes.ts
var import_express4 = require("express");

// src/server/controllers/syncController.ts
init_db();
init_response();
var import_zod5 = require("zod");
var auditLogArchiveSchema = import_zod5.z.object({
  session_date: import_zod5.z.string().min(1),
  archived_at: import_zod5.z.string().optional(),
  archived_by: import_zod5.z.string().optional(),
  log_count: import_zod5.z.number().int().min(0).default(0),
  total_incidents: import_zod5.z.number().int().min(0).default(0),
  resolved_count: import_zod5.z.number().int().min(0).default(0),
  unresolved_count: import_zod5.z.number().int().min(0).default(0),
  log_entries: import_zod5.z.array(import_zod5.z.any()).default([]),
  notes: import_zod5.z.string().optional()
});
var getSync = async (req, res) => {
  const { path: fullPath } = req.query;
  console.log(`[SYNC] getSync requested: ${fullPath} from user: ${req.user?.id} role: ${req.user?.role}`);
  if (!fullPath) return error(res, "Path required", "BAD_REQUEST", 400);
  const fullPathStr = decodeURIComponent(fullPath);
  const [basePath, searchParams] = fullPathStr.split("?");
  const parts = basePath.split("/");
  const collection = parts[0];
  const id = parts[1];
  const subCollection = parts[2];
  if (id === "undefined" || id === "null") {
    return error(res, "Invalid ID parameter", "BAD_REQUEST", 400);
  }
  try {
    const userRole = req.user?.role;
    const isAdmin = userRole === "admin" || userRole === "superadmin";
    const isTanod = userRole === "tanod" || isAdmin;
    if (collection === "system") {
      if (id === "siren") {
        const result = await pool.query("SELECT data FROM system_config WHERE key = 'siren'");
        return res.json(result.rows[0]?.data || { sirenActive: false });
      }
      if (id === "developer") {
        const result = await pool.query("SELECT data FROM system_config WHERE key = 'developer'");
        return res.json(result.rows[0]?.data || { name: "Ruben Llego O.", avatarUrl: null });
      }
    }
    if (collection === "alerts" || collection === "active_alerts") {
      if (id && subCollection === "messages") {
        const result = await pool.query(
          "SELECT * FROM alert_messages WHERE alert_id = $1 ORDER BY timestamp ASC",
          [id]
        );
        return res.json(result.rows);
      }
      if (id) {
        const result = await pool.query(
          'SELECT a.*, u.name as "residentName" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.id = $1',
          [id]
        );
        const alert = result.rows[0];
        if (!alert) return error(res, "Alert not found", "NOT_FOUND", 404);
        if (!isTanod && alert.resident_id !== req.user?.id) {
          return error(res, "Unauthorized access to alert details", "FORBIDDEN", 403);
        }
        return res.json({
          ...alert,
          location: typeof alert.location === "string" ? JSON.parse(alert.location) : alert.location,
          timestamp: alert.created_at
        });
      } else {
        let query2 = 'SELECT a.*, u.name as "residentName" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id ORDER BY a.created_at DESC LIMIT 100';
        let params = [];
        if (!isTanod) {
          query2 = 'SELECT a.*, u.name as "residentName" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.resident_id = $1 ORDER BY a.created_at DESC LIMIT 100';
          params = [req.user?.id];
        }
        const result = await pool.query(query2, params);
        return res.json(result.rows.map((a) => ({
          ...a,
          location: typeof a.location === "string" ? JSON.parse(a.location) : a.location,
          timestamp: a.created_at
        })));
      }
    }
    if (collection === "incidents") {
      if (!isTanod) return error(res, "Unauthorized", "FORBIDDEN", 403);
      const result = await pool.query("SELECT * FROM incidents ORDER BY timestamp DESC LIMIT 100");
      return res.json(result.rows.map((i) => ({
        id: i.id,
        ...i,
        tanodName: i.tanod_name,
        citizen: i.citizen_name || "Citizen",
        date: i.timestamp ? new Date(i.timestamp).toISOString().split("T")[0] : "Unknown",
        time: i.timestamp ? new Date(i.timestamp).toLocaleTimeString() : "Unknown"
      })));
    }
    if (collection === "users" || collection === "residents") {
      if (searchParams?.includes("role=tanod")) {
        const result2 = await pool.query("SELECT id, email, name, role, status, last_active FROM users WHERE role = 'tanod'");
        return res.json(result2.rows);
      }
      if (id) {
        if (!isTanod && id !== req.user?.id) return error(res, "Forbidden", "FORBIDDEN", 403);
        const result2 = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
        const user = result2.rows[0];
        if (user && collection === "residents") {
          const resInfo = await pool.query("SELECT * FROM residents WHERE id = $1", [id]);
          return res.json({ ...user, ...resInfo.rows[0] });
        }
        return res.json(user || null);
      }
      if (!isTanod) return error(res, "Forbidden", "FORBIDDEN", 403);
      if (collection === "residents") {
        const result2 = await pool.query("SELECT u.id, u.email, u.name, u.role, u.status, r.* FROM users u JOIN residents r ON u.id = r.id WHERE u.role = 'resident'");
        return res.json(result2.rows);
      }
      const result = await pool.query("SELECT id, email, name, role, status FROM users WHERE role = 'resident'");
      return res.json(result.rows);
    }
    if (collection === "patrols") {
      const result = await pool.query("SELECT * FROM patrols");
      return res.json(result.rows.map((p) => ({
        id: p.tanod_id,
        tanodId: p.tanod_id,
        tanodName: p.tanod_name,
        isActive: p.is_active,
        status: p.status,
        location: typeof p.location === "string" ? JSON.parse(p.location) : p.location,
        lastUpdate: p.last_ping
      })));
    }
    if (collection === "system_broadcasts" || collection === "broadcasts") {
      const query2 = searchParams?.includes("isActive=true") ? "SELECT * FROM system_broadcasts WHERE isactive = true ORDER BY timestamp DESC" : "SELECT * FROM system_broadcasts ORDER BY timestamp DESC LIMIT 100";
      const result = await pool.query(query2);
      return res.json(result.rows);
    }
    if (collection === "audit_logs") {
      if (!isAdmin) return error(res, "Admin Access Required", "FORBIDDEN", 403);
      const result = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100");
      return res.json(result.rows);
    }
    if (collection === "audit_log_archives") {
      if (!isAdmin) return error(res, "Admin Access Required", "FORBIDDEN", 403);
      const result = await pool.query("SELECT * FROM audit_log_archives ORDER BY archived_at DESC LIMIT 50");
      return res.json(result.rows.map((row) => ({
        ...row,
        log_entries: typeof row.log_entries === "string" ? JSON.parse(row.log_entries) : row.log_entries || []
      })));
    }
    if (collection === "tanod_activity_logs") {
      if (!isTanod) return error(res, "Tanod/Admin Access Required", "FORBIDDEN", 403);
      const result = await pool.query("SELECT * FROM tanod_activity_logs ORDER BY timestamp DESC LIMIT 100");
      return res.json(result.rows.map((l) => ({
        id: l.id,
        ...l,
        location: typeof l.location === "string" ? JSON.parse(l.location) : l.location
      })));
    }
    if (collection === "witness_invites") {
      let query2 = "SELECT * FROM witness_invites";
      let params = [];
      if (searchParams) {
        const urlParams = new URLSearchParams(searchParams);
        const witnessUserId = urlParams.get("witnessUserId");
        const alertId = urlParams.get("alertId");
        const status = urlParams.get("status");
        const conditions = [];
        if (witnessUserId) {
          conditions.push(`witness_user_id = $${params.length + 1}`);
          params.push(witnessUserId);
        }
        if (alertId) {
          conditions.push(`alert_id = $${params.length + 1}`);
          params.push(alertId);
        }
        if (status) {
          conditions.push(`status = $${params.length + 1}`);
          params.push(status);
        }
        if (conditions.length > 0) {
          query2 += " WHERE " + conditions.join(" AND ");
        }
      }
      const result = await pool.query(query2, params);
      return res.json(result.rows.map((r) => ({
        id: r.id,
        alertId: r.alert_id,
        witnessUserId: r.witness_user_id,
        status: r.status,
        timestamp: r.timestamp
      })));
    }
    if (collection === "patrol_sessions") {
      const result = await pool.query("SELECT * FROM patrol_sessions ORDER BY start_time DESC LIMIT 50");
      return res.json(result.rows.map((s) => ({
        id: s.id,
        ...s,
        route: typeof s.route === "string" ? JSON.parse(s.route) : s.route
      })));
    }
    if (collection === "shifts") {
      const results = await ShiftRepository.getAll();
      return res.json(results);
    }
    error(res, `Path not mapped: ${fullPathStr}`, "NOT_IMPLEMENTED", 404);
  } catch (err) {
    error(res, err.message);
  }
};
var postSync = async (req, res) => {
  const { path: fullPath, id, data, options } = req.body;
  if (!fullPath) return error(res, "Path required", "BAD_REQUEST", 400);
  const parts = fullPath.split("/");
  const collection = parts[0];
  const docId = id || parts[1];
  const subCollection = parts[2];
  if (docId === "undefined" || docId === "null") {
    return error(res, "Invalid ID parameter", "BAD_REQUEST", 400);
  }
  try {
    const userRole = req.user?.role;
    const isAdmin = userRole === "admin" || userRole === "superadmin";
    const isTanod = userRole === "tanod" || isAdmin;
    if (collection === "system") {
      if (docId === "siren" || docId === "developer") {
        if (!isTanod) return error(res, `Full clearance required for ${docId === "siren" ? "Siren" : "Developer"} Control`, "FORBIDDEN", 403);
        await pool.query(
          "INSERT INTO system_config (key, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET data = $2, updated_at = now()",
          [docId, JSON.stringify(data)]
        );
        if (docId === "siren") emitToAll("siren_update", data);
        return res.json({ success: true });
      }
    }
    if (collection === "patrol_sessions") {
      if (!isTanod) return error(res, "Access Denied", "FORBIDDEN", 403);
      if (options?.merge) {
        const current = await pool.query("SELECT route FROM patrol_sessions WHERE id = $1", [docId]);
        let newRoute = data.route;
        if (data.route?._type === "arrayUnion" && current.rows[0]) {
          newRoute = [...current.rows[0].route || [], ...data.route.elements];
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
    if (collection === "tanod_activity_logs") {
      if (!isTanod) return error(res, "Access Denied", "FORBIDDEN", 403);
      await pool.query(
        "INSERT INTO tanod_activity_logs (tanod_id, tanod_name, type, timestamp, details, location) VALUES ($1, $2, $3, $4, $5, $6)",
        [data.tanodId, data.tanodName, data.type, data.timestamp, data.details, JSON.stringify(data.location || null)]
      );
      return res.json({ success: true });
    }
    if (collection === "users") {
      if (!isAdmin && docId !== req.user?.id) return error(res, "Forbidden", "FORBIDDEN", 403);
      const fieldMapping = { status: "status", role: "role", name: "name", email: "email" };
      if (!isAdmin) {
        delete data.role;
        delete data.status;
      }
      const safeData = {};
      Object.keys(data).forEach((key) => {
        if (fieldMapping[key]) safeData[fieldMapping[key]] = data[key];
      });
      const safeFields = Object.keys(safeData);
      if (safeFields.length === 0) return error(res, "No valid fields to update", "BAD_REQUEST", 400);
      const setClause = safeFields.map((f, i) => `${f} = $${i + 2}`).join(", ");
      await pool.query(`UPDATE users SET ${setClause}, last_active = now() WHERE id = $1`, [docId, ...safeFields.map((f) => safeData[f])]);
      emitToAll("tanod_update", { id: docId, ...safeData });
      return res.json({ success: true });
    }
    if (collection === "residents") {
      if (!isTanod && docId !== req.user?.id) return error(res, "Forbidden", "FORBIDDEN", 403);
      const fieldMapping = {
        name: "name",
        phone: "phone",
        address: "address",
        status: "status",
        houseNumber: "house_number",
        householdSize: "household_size",
        bloodType: "blood_type",
        medicalConditions: "medical_conditions",
        emergencyContactName: "emergency_contact_name",
        emergencyContactPhone: "emergency_contact_phone",
        gpsLat: "gps_lat",
        gpsLng: "gps_lng",
        isVerified: "is_verified",
        verificationDate: "verification_date",
        rejectionReason: "rejection_reason"
      };
      if (!isTanod) {
        delete data.status;
        delete data.is_verified;
        delete data.verification_date;
        delete data.rejection_reason;
      }
      const safeData = {};
      Object.keys(data).forEach((key) => {
        const mapped = fieldMapping[key] || fieldMapping[key.replace(/([A-Z])/g, "_$1").toLowerCase()];
        if (mapped) safeData[mapped] = data[key];
      });
      const safeFields = Object.keys(safeData);
      if (safeFields.length === 0) return error(res, "No valid fields to update", "BAD_REQUEST", 400);
      const setClause = safeFields.map((f, i) => `${f} = $${i + 2}`).join(", ");
      await pool.query(`UPDATE residents SET ${setClause} WHERE id = $1`, [docId, ...safeFields.map((f) => safeData[f])]);
      emitToAll("resident_update", { id: docId, ...safeData });
      return res.json({ success: true });
    }
    if (collection === "patrols") {
      if (!isTanod) return error(res, "Access Denied", "FORBIDDEN", 403);
      const isActive = data.isActive ?? data.is_active;
      const location = data.location ? JSON.stringify(data.location) : null;
      const status = data.status;
      const tanodName = data.tanodName ?? data.tanod_name;
      await pool.query(
        `INSERT INTO patrols (tanod_id, is_active, location, status, tanod_name, last_ping)
         VALUES ($1, COALESCE($2, true), COALESCE($3, '{}'::jsonb), COALESCE($4, 'Available'), COALESCE($5, 'Active Tanod'), now())
         ON CONFLICT (tanod_id) DO UPDATE SET
         is_active = COALESCE(EXCLUDED.is_active, patrols.is_active),
         location = CASE WHEN EXCLUDED.location = '{}'::jsonb AND patrols.location IS NOT NULL THEN patrols.location ELSE EXCLUDED.location END,
         status = COALESCE(EXCLUDED.status, patrols.status),
         tanod_name = CASE WHEN EXCLUDED.tanod_name = 'Active Tanod' AND patrols.tanod_name IS NOT NULL THEN patrols.tanod_name ELSE EXCLUDED.tanod_name END,
         last_ping = now()`,
        [docId, isActive, location, status, tanodName]
      );
      emitToAll("patrol_update", {
        tanod_id: docId,
        tanodId: docId,
        tanodName,
        isActive,
        location: data.location,
        status,
        lastUpdate: (/* @__PURE__ */ new Date()).toISOString()
      });
      return res.json({ success: true });
    }
    if (collection === "system_broadcasts" || collection === "broadcasts") {
      if (!isTanod) return error(res, "Admin Access Required", "FORBIDDEN", 403);
      if (docId) {
        const fieldMapping = {
          isActive: "isactive",
          approvalStatus: "approval_status",
          adminId: "admin_id",
          adminName: "admin_name",
          type: "type"
        };
        const updateFields = Object.keys(data).filter((f) => fieldMapping[f]);
        if (updateFields.length === 0) return error(res, "No valid fields to update", "BAD_REQUEST", 400);
        const setClause = updateFields.map((f, i) => `${fieldMapping[f]} = $${i + 2}`).join(", ");
        await pool.query(`UPDATE system_broadcasts SET ${setClause} WHERE id = $1`, [docId, ...updateFields.map((f) => data[f])]);
        const result = await pool.query("SELECT * FROM system_broadcasts WHERE id = $1", [docId]);
        emitToAll("broadcast_update", result.rows[0]);
        return res.json({ success: true, broadcast: result.rows[0] });
      } else {
        const result = await pool.query(
          "INSERT INTO system_broadcasts (admin_id, admin_name, message, type, isactive, timestamp, approval_status, ai_recommendation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
          [data.adminId, data.adminName, data.message, data.type, data.isActive ?? false, data.timestamp || (/* @__PURE__ */ new Date()).toISOString(), data.approvalStatus || "pending", data.aiRecommendation ? JSON.stringify(data.aiRecommendation) : null]
        );
        emitToAll("broadcast_update", result.rows[0]);
        return res.json({ success: true, broadcast: result.rows[0] });
      }
    }
    if (collection === "incidents") {
      if (!isTanod) return error(res, "Access Denied", "FORBIDDEN", 403);
      await pool.query(
        `INSERT INTO incidents (alert_id, tanod_id, tanod_name, citizen_name, timestamp, type, location, gps_location, description, persons_involved, actions_taken, status, responded_at, resolved_at, admin_on_duty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          data.alertId || null,
          // If tanodId is passed as "Name (Handle)", it wont be a valid UUID.
          // We need to resolve the ID from name/handle or set to null if not a valid UUID.
          data.tanodId && data.tanodId.length === 36 && data.tanodId.includes("-") ? data.tanodId : null,
          data.tanodName,
          data.citizenName || data.citizen || "Unknown",
          data.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
          data.type,
          data.location,
          JSON.stringify(data.gpsLocation || null),
          data.description,
          data.personsInvolved || null,
          data.actionsTaken || null,
          data.status || "pending",
          data.respondedAt || null,
          data.resolvedAt || null,
          data.adminOnDuty && data.adminOnDuty.length === 36 && data.adminOnDuty.includes("-") ? data.adminOnDuty : null
        ]
      );
      return res.json({ success: true });
    }
    if (collection === "shifts") {
      if (!isAdmin) return error(res, "Admin Access Required", "FORBIDDEN", 403);
      if (docId) {
        await ShiftRepository.update(docId, data);
      } else {
        await ShiftRepository.create(data);
      }
      emitToAll("shift_update", { id: docId || "new", data });
      return res.json({ success: true });
    }
    if (collection === "alerts") {
      if (subCollection === "messages") {
        const result = await pool.query(
          "INSERT INTO alert_messages (alert_id, sender_id, sender_name, message, type, timestamp) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
          [docId, req.user?.id, data.senderName || "User", data.message, data.type || "text", data.timestamp || (/* @__PURE__ */ new Date()).toISOString()]
        );
        emitToRoom(`incident_${docId}`, "new_message", result.rows[0]);
        return res.json({ success: true, id: result.rows[0].id });
      }
      const alertCheck = await pool.query("SELECT resident_id FROM alerts WHERE id = $1", [docId]);
      if (alertCheck.rows.length === 0) return error(res, "Alert not found", "NOT_FOUND", 404);
      const isOwner = alertCheck.rows[0].resident_id === req.user?.id;
      if (!isTanod && !isOwner) return error(res, "Access Denied", "FORBIDDEN", 403);
      const fieldMap = {
        "status": "status",
        "severityScore": "severity_score",
        "severity_score": "severity_score",
        "aiAnalysis": "ai_analysis",
        "ai_analysis": "ai_analysis",
        "resolvedAt": "resolved_at",
        "resolved_at": "resolved_at",
        "assignedTo": "assigned_to",
        "assigned_to": "assigned_to",
        "assignedToName": "assigned_to_name",
        "assigned_to_name": "assigned_to_name",
        "respondedAt": "responded_at",
        "responded_at": "responded_at",
        "respondedBy": "responded_by",
        "responded_by": "responded_by",
        "respondedByName": "responded_by_name",
        "responded_by_name": "responded_by_name",
        "resolutionNotes": "resolution_notes",
        "resolution_notes": "resolution_notes",
        "responderNotes": "responder_notes",
        "responder_notes": "responder_notes",
        "description": "description",
        "location": "location",
        "type": "type"
      };
      const allowedFields = isTanod ? Object.keys(fieldMap) : ["description", "location", "type"];
      const updateFields = Object.keys(data).filter((f) => allowedFields.includes(f));
      if (updateFields.length > 0) {
        const setClause = updateFields.map((f, i) => `${fieldMap[f] || f} = $${i + 2}`).join(", ");
        const values = updateFields.map((f) => {
          const val = data[f];
          if (f === "location" || f === "aiAnalysis" || f === "ai_analysis") {
            return typeof val === "object" ? JSON.stringify(val) : val;
          }
          return val;
        });
        await pool.query(`UPDATE alerts SET ${setClause}, updated_at = now() WHERE id = $1`, [docId, ...values]);
        const result = await pool.query('SELECT a.*, u.name as "residentName" FROM alerts a LEFT JOIN users u ON a.resident_id = u.id WHERE a.id = $1', [docId]);
        const alert = result.rows[0];
        const formattedAlert = {
          ...alert,
          residentId: alert.resident_id,
          assignedTo: alert.assigned_to,
          assignedToName: alert.assigned_to_name,
          respondedAt: alert.responded_at,
          respondedBy: alert.responded_by,
          respondedByName: alert.responded_by_name,
          resolvedAt: alert.resolved_at,
          resolutionNotes: alert.resolution_notes,
          responderNotes: alert.responder_notes,
          severityScore: alert.severity_score,
          aiAnalysis: typeof alert.ai_analysis === "string" ? JSON.parse(alert.ai_analysis) : alert.ai_analysis,
          location: typeof alert.location === "string" ? JSON.parse(alert.location) : alert.location,
          timestamp: alert.created_at
        };
        emitToAll("alert_update", {
          type: "update",
          alert: formattedAlert
        });
      }
      return res.json({ success: true });
    }
    if (collection === "witness_invites") {
      if (docId) {
        const allowedFields = ["status"];
        const updateFields = Object.keys(data).filter((f) => allowedFields.includes(f));
        if (updateFields.length > 0) {
          const setClause = updateFields.map((f, i) => `${f === "status" ? "status" : f} = $${i + 2}`).join(", ");
          await pool.query(`UPDATE witness_invites SET ${setClause} WHERE id = $1`, [docId, ...updateFields.map((f) => data[f])]);
        }
      } else {
        await pool.query(
          "INSERT INTO witness_invites (alert_id, witness_user_id, status, timestamp) VALUES ($1, $2, $3, $4)",
          [data.alertId, data.witnessUserId, data.status || "pending", data.timestamp || (/* @__PURE__ */ new Date()).toISOString()]
        );
      }
      return res.json({ success: true });
    }
    if (collection === "audit_logs") {
      if (!isTanod) return error(res, "Access Denied", "FORBIDDEN", 403);
      await pool.query(
        `INSERT INTO audit_logs (incident_id, type, status, citizen_id, tanod_assigned, location_lat, location_lng, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [data.incident_id, data.type, data.status, data.citizen_id, data.tanod_assigned, data.location_lat, data.location_lng, data.notes, data.created_at || (/* @__PURE__ */ new Date()).toISOString()]
      );
      return res.json({ success: true });
    }
    if (collection === "audit_log_archives") {
      if (!isAdmin) return error(res, "Access Denied", "FORBIDDEN", 403);
      const parsed = auditLogArchiveSchema.safeParse(data);
      if (!parsed.success) {
        return error(
          res,
          `Invalid archive data: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
          "BAD_REQUEST",
          400
        );
      }
      const d = parsed.data;
      await pool.query(
        `INSERT INTO audit_log_archives
           (session_date, archived_at, archived_by, log_count, total_incidents,
            resolved_count, unresolved_count, log_entries, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          d.session_date,
          d.archived_at || (/* @__PURE__ */ new Date()).toISOString(),
          d.archived_by,
          d.log_count,
          d.total_incidents,
          d.resolved_count,
          d.unresolved_count,
          JSON.stringify(d.log_entries),
          d.notes
        ]
      );
      return res.json({ success: true });
    }
    error(res, "Path not mapped", "NOT_FOUND", 404);
  } catch (err) {
    error(res, err.message);
  }
};
var deleteSync = async (req, res) => {
  const { path: fullPath, id } = req.body;
  if (!fullPath) return error(res, "Path required", "BAD_REQUEST", 400);
  const parts = fullPath.split("/");
  const collection = parts[0];
  const docId = id || parts[1];
  if (docId === "undefined" || docId === "null") {
    return error(res, "Invalid ID parameter", "BAD_REQUEST", 400);
  }
  try {
    const userRole = req.user?.role;
    const isAdmin = userRole === "admin" || userRole === "superadmin";
    const isTanod = userRole === "tanod" || isAdmin;
    const DELETABLE_COLLECTIONS = {
      alerts: "alerts",
      system_broadcasts: "system_broadcasts",
      tanod_activity_logs: "tanod_activity_logs",
      incidents: "incidents",
      audit_log_archives: "audit_log_archives"
    };
    if ((Object.keys(DELETABLE_COLLECTIONS).includes(collection) || collection === "shifts") && docId) {
      if (!isTanod) return error(res, "Administrative clearance required for deletion", "FORBIDDEN", 403);
      if (collection === "shifts") {
        await ShiftRepository.delete(docId);
        emitToAll("shift_update", { id: docId, deleted: true });
      } else {
        const tableName = DELETABLE_COLLECTIONS[collection];
        await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [docId]);
      }
      return res.json({ success: true });
    }
    error(res, `Delete not supported for: ${fullPath}`, "BAD_REQUEST", 400);
  } catch (err) {
    error(res, err.message);
  }
};

// src/server/routes/syncRoutes.ts
var router4 = (0, import_express4.Router)();
router4.get("/", authenticate, getSync);
router4.post("/", authenticate, postSync);
router4.delete("/", authenticate, deleteSync);
var syncRoutes_default = router4;

// src/server/routes/systemRoutes.ts
var import_express5 = require("express");
init_db();
init_response();
var import_express_rate_limit2 = require("express-rate-limit");
var router5 = (0, import_express5.Router)();
var smsLimiter = (0, import_express_rate_limit2.rateLimit)({
  windowMs: 5 * 60 * 1e3,
  limit: 10,
  message: { success: false, error: { code: "TOO_MANY_REQUESTS", message: "Too many SMS requests. Please wait a moment." } },
  standardHeaders: "draft-8",
  legacyHeaders: false
});
router5.post("/siren", authenticate, authorize(["admin", "superadmin", "tanod"]), async (req, res) => {
  const { sirenActive } = req.body;
  try {
    await pool.query(
      "INSERT INTO system_config (key, data, updated_at) VALUES ('siren', $1, now()) ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = now()",
      [JSON.stringify({ sirenActive })]
    );
    emitToAll("siren_update", { sirenActive });
    success(res, { sirenActive });
  } catch (err) {
    error(res, err.message);
  }
});
router5.patch("/users/:id", authenticate, authorize(["admin", "superadmin"]), async (req, res) => {
  const { status, role } = req.body;
  const updates = [];
  const values = [];
  let i = 1;
  if (status) {
    updates.push(`status = $${i++}`);
    values.push(status);
  }
  if (role) {
    updates.push(`role = $${i++}`);
    values.push(role);
  }
  if (updates.length === 0) return error(res, "Nothing to update", "BAD_REQUEST", 400);
  values.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return error(res, "User not found", "NOT_FOUND", 404);
    const updatedUser = result.rows[0];
    emitToAll("tanod_update", { id: updatedUser.id, status: updatedUser.status, role: updatedUser.role });
    success(res, updatedUser);
  } catch (err) {
    error(res, err.message);
  }
});
router5.post("/sms", authenticate, smsLimiter, async (req, res) => {
  const { to, message } = req.body ?? {};
  if (!to || !message) {
    return error(res, "to and message are required", "BAD_REQUEST", 400);
  }
  const apiKey = process.env.SEMAPHORE_API_KEY;
  if (!apiKey) {
    console.log("[SMS Simulation]", { to, message });
    return res.json({ success: true, simulated: true });
  }
  try {
    const fetchResponse = await fetch(
      "https://api.semaphore.co/api/v4/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ apikey: apiKey, number: to, message })
      }
    );
    if (!fetchResponse.ok) {
      const detail = await fetchResponse.text();
      return res.status(502).json({ success: false, error: { code: "BAD_GATEWAY", message: "Semaphore API error", detail } });
    }
    const data = await fetchResponse.json();
    return res.json({ success: true, data });
  } catch (err) {
    console.error("[SMS] Fetch failed:", err);
    return res.status(502).json({ success: false, error: { code: "BAD_GATEWAY", message: "Could not reach Semaphore API" } });
  }
});
router5.post("/tts", authenticate, authorize(["resident", "admin", "superadmin", "captain", "tanod"]), async (req, res) => {
  const { text: text2, options } = req.body;
  if (!text2) {
    return error(res, "Text is required", "BAD_REQUEST", 400);
  }
  try {
    const buffer = await ttsService.generateSpeech({ text: text2, ...options });
    if (!buffer || buffer.length === 0) {
      return error(res, "Failed to generate TTS (empty buffer)", "TTS_FAILED", 500);
    }
    console.log(`[TTS] Serving buffer of size: ${buffer.length} bytes`);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error("TTS Error:", err);
    error(res, err.message, "TTS_ERROR", 500);
  }
});
var systemRoutes_default = router5;

// src/server/routes/voiceRoutes.ts
var import_express6 = require("express");
var router6 = (0, import_express6.Router)();
var voiceRoutes_default = router6;

// src/server/routes/aiRoutes.ts
var import_express7 = require("express");
var router7 = (0, import_express7.Router)();
router7.post("/analyze", authenticate, async (req, res) => {
  const { description, initialType } = req.body;
  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_INPUT", message: "description is required" }
    });
  }
  try {
    const analysis = await analyzeIncident(description.slice(0, 500), initialType);
    return res.json({ success: true, analysis });
  } catch (err) {
    console.error("[AI Route] analyzeIncident failed:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: "AI_ERROR", message: "AI analysis failed. Fallback used on client." }
    });
  }
});
var aiRoutes_default = router7;

// src/server/routes/adminRoutes.ts
var import_express8 = require("express");

// src/server/controllers/adminController.ts
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
init_db();
init_response();
var createUser = async (req, res) => {
  const { email, password, name, role, details } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return error(res, "A user with that email already exists.", "CONFLICT", 409);
    }
    const hashedPass = await import_bcryptjs2.default.hash(password, 12);
    const result = await client.query(
      `INSERT INTO users (email, password, name, role, status)
       VALUES ($1, $2, $3, $4, 'verified')
       RETURNING id, email, name, role, status`,
      [email, hashedPass, name, role]
    );
    const user = result.rows[0];
    if (role === "tanod") {
      await client.query(
        `INSERT INTO patrols (tanod_id, tanod_name, is_active, status)
         VALUES ($1, $2, false, 'offline')`,
        [user.id, name]
      );
    }
    if (role === "resident" && details) {
      await client.query(
        `INSERT INTO residents
           (id, name, phone, address, house_number, household_size,
            blood_type, medical_conditions,
            emergency_contact_name, emergency_contact_phone)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          user.id,
          name,
          details.phone,
          details.address,
          details.houseNumber,
          details.householdSize,
          details.bloodType,
          details.medicalConditions,
          details.emergencyContactName,
          details.emergencyContactPhone
        ]
      );
    }
    await logAction(req.user.id, "ADMIN_CREATE_USER", "users", user.id, {
      createdRole: role,
      createdEmail: email
    });
    await client.query("COMMIT");
    return success(res, { user }, "User created successfully.", 201);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Admin] createUser error:", err.message);
    return error(res, "Failed to create user. Please try again.");
  } finally {
    client.release();
  }
};
var listUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, role, status, created_at, last_active
       FROM users
       ORDER BY created_at DESC`
    );
    return success(res, result.rows);
  } catch (err) {
    console.error("[Admin] listUsers error:", err.message);
    return error(res, "Failed to fetch users.");
  }
};
var updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const allowedRoles = ["resident", "tanod", "admin", "superadmin"];
  if (!allowedRoles.includes(role)) {
    return error(res, "Invalid role specified.", "BAD_REQUEST", 400);
  }
  try {
    const result = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, email, name, role, status`,
      [role, id]
    );
    if (result.rows.length === 0) {
      return error(res, "User not found.", "NOT_FOUND", 404);
    }
    await logAction(req.user.id, "ADMIN_UPDATE_ROLE", "users", id, {
      newRole: role
    });
    return success(res, result.rows[0], "User role updated.");
  } catch (err) {
    console.error("[Admin] updateUserRole error:", err.message);
    return error(res, "Failed to update role.");
  }
};
var updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowedStatuses = ["pending", "verified", "suspended"];
  if (!allowedStatuses.includes(status)) {
    return error(res, "Invalid status specified.", "BAD_REQUEST", 400);
  }
  try {
    const result = await pool.query(
      `UPDATE users SET status = $1 WHERE id = $2
       RETURNING id, email, name, role, status`,
      [status, id]
    );
    if (result.rows.length === 0) {
      return error(res, "User not found.", "NOT_FOUND", 404);
    }
    await logAction(req.user.id, "ADMIN_UPDATE_STATUS", "users", id, {
      newStatus: status
    });
    return success(res, result.rows[0], "User status updated.");
  } catch (err) {
    console.error("[Admin] updateUserStatus error:", err.message);
    return error(res, "Failed to update status.");
  }
};
var deleteUser = async (req, res) => {
  const { id } = req.params;
  if (req.user.id === id) {
    return error(res, "You cannot delete your own account.", "FORBIDDEN", 403);
  }
  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id, email, role",
      [id]
    );
    if (result.rows.length === 0) {
      return error(res, "User not found.", "NOT_FOUND", 404);
    }
    await logAction(req.user.id, "ADMIN_DELETE_USER", "users", id, {
      deletedEmail: result.rows[0].email,
      deletedRole: result.rows[0].role
    });
    return success(res, null, "User deleted successfully.");
  } catch (err) {
    console.error("[Admin] deleteUser error:", err.message);
    return error(res, "Failed to delete user.");
  }
};

// src/server/routes/adminRoutes.ts
var router8 = (0, import_express8.Router)();
router8.use(authenticate);
router8.use(authorize(["admin", "superadmin"]));
router8.post(
  "/users",
  strictRateLimiter,
  validate(adminCreateUserSchema),
  createUser
);
router8.get("/users", listUsers);
router8.patch("/users/:id/role", updateUserRole);
router8.patch("/users/:id/status", updateUserStatus);
router8.delete("/users/:id", deleteUser);
var adminRoutes_default = router8;

// src/server/routes/index.ts
var setupRoutes = (app2) => {
  app2.get("/api/health", async (req, res) => {
    const { checkConnection: checkConnection2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const dbConnected = await checkConnection2();
    res.json({
      success: true,
      status: dbConnected ? "operational" : "degraded",
      db: dbConnected ? "connected" : "disconnected",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      message: "Brgy. Tanod S.O.S. API is running"
    });
  });
  app2.use("/api/auth", authRoutes_default);
  app2.use("/api/sos", sosRoutes_default);
  app2.use("/api/analytics", analyticsRoutes_default);
  app2.use("/api/sync", syncRoutes_default);
  app2.use("/api/system", systemRoutes_default);
  app2.use("/api/voice", voiceRoutes_default);
  app2.use("/api/ai", aiRoutes_default);
  app2.use("/api/admin", adminRoutes_default);
  app2.use("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "API endpoint not found" }
    });
  });
};

// src/server/app.ts
init_error();
init_config();
var app = (0, import_express9.default)();
app.set("trust proxy", 1);
var allowedOrigins = config.corsOrigin ? config.corsOrigin.split(",").map((o) => o.trim()).filter(Boolean) : [];
app.use(
  (0, import_helmet.default)({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: config.nodeEnv === "production" ? ["'self'", "https://fonts.googleapis.com"] : ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.tile.openstreetmap.org",
          "https://*.openstreetmap.org"
        ],
        connectSrc: [
          "'self'",
          "wss:",
          "ws:",
          "https://generativelanguage.googleapis.com",
          "https://api.elevenlabs.io"
        ],
        mediaSrc: ["'self'", "blob:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    frameguard: { action: "sameorigin" },
    crossOriginEmbedderPolicy: false
  })
);
app.use(
  (0, import_cors.default)({
    origin: (origin, callback) => {
      const isStudioPreview = !!origin && (origin.endsWith(".run.app") || origin.startsWith("http://localhost:3000"));
      const isDevFallback = allowedOrigins.length === 0 && config.nodeEnv !== "production";
      if (!origin || origin === "null" || isStudioPreview || isDevFallback || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`[CORS] Origin rejected: ${origin}`);
      return callback(null, false);
    },
    credentials: true
  })
);
app.use(import_express9.default.json({ limit: "5mb" }));
app.use(import_express9.default.urlencoded({ extended: true }));
app.use((0, import_cookie_parser.default)());
app.use("/api/", globalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/sos/alert", sosLimiter);
setupRoutes(app);
app.use(errorHandler);
var app_default = app;

// src/server/services/dbService.ts
init_db();
init_config();
var import_bcryptjs3 = __toESM(require("bcryptjs"), 1);
async function initDb(retries = 3) {
  for (let i = 0; i < retries; i++) {
    let client;
    try {
      logger.info(`DB_INIT: Attempting to connect (Attempt ${i + 1}/${retries})...`);
      client = await pool.connect();
      logger.info("DB_INIT: Auth Successful.");
      const adminResult = await client.query("SELECT * FROM users WHERE role = 'admin' OR role = 'superadmin'");
      if (adminResult.rows.length === 0) {
        const { email: adminEmail, password: adminPassword } = config.adminBootstrap;
        if (!adminEmail || !adminPassword) {
          throw new Error("ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be set in .env to create the first admin account.");
        }
        const hashedPass = await import_bcryptjs3.default.hash(adminPassword, 10);
        await client.query(
          "INSERT INTO users (email, password, name, role, status) VALUES ($1, $2, $3, $4, $5)",
          [adminEmail, hashedPass, "Super Admin", "admin", "verified"]
        );
        console.log(`Successfully bootstrapped first admin: ${adminEmail}`);
      }
      await client.query(`
        INSERT INTO system_config (key, data)
        VALUES ('siren', '{"sirenActive": false}')
        ON CONFLICT DO NOTHING
      `);
      logger.info("DB_INIT: Schema synchronized.");
      return;
    } catch (err) {
      logger.error(`DB_INIT_ERROR (Attempt ${i + 1}): ${err.message}`);
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, 2e3));
      } else {
        throw err;
      }
    } finally {
      if (client) client.release();
    }
  }
}

// server.ts
init_db();
init_config();
async function startServer() {
  try {
    initDatabase();
    await initDb();
  } catch (err) {
    console.error("CRITICAL: Database initialization failed. Server cannot start safely.", err);
    process.exit(1);
  }
  const server = http.createServer(app_default);
  process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("UNHANDLED REJECTION:", reason);
  });
  initSocket(server);
  if (config.nodeEnv !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app_default.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.resolve(process.cwd(), "dist");
    const indexPath = import_path2.default.join(distPath, "index.html");
    console.log(`[Production] Environment detected.`);
    console.log(`[Production] System Root: ${process.cwd()}`);
    console.log(`[Production] Target Asset Directory: ${distPath}`);
    app_default.use(
      import_express10.default.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".js") || filePath.endsWith(".css")) {
            res.setHeader("Cache-Control", "public, max-age=31536000");
          }
        }
      })
    );
    app_default.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({
          success: false,
          error: "API endpoint not found"
        });
      }
      console.log(`[Production] Serving fallback shell for: ${req.path}`);
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`[Production] FAILED to serve index.html from ${indexPath}: ${err.message}`);
          res.status(500).json({
            success: false,
            error: "Application initialization error",
            details: "Application shell could not be served."
          });
        }
      });
    });
  }
  const { errorHandler: errorHandler2, notFoundHandler: notFoundHandler2 } = await Promise.resolve().then(() => (init_error(), error_exports));
  app_default.use(notFoundHandler2);
  app_default.use(errorHandler2);
  server.listen(config.port, "0.0.0.0", () => {
    console.log(`
  ==================================================
  BRGY. TANOD S.O.S. - EMERGENCY PLATFORM
  ==================================================
  Server Status: OPERATIONAL
  Port: ${config.port}
  Environment: ${config.nodeEnv}
  Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}
  ==================================================
    `);
  });
}
startServer().catch((err) => {
  console.error("FATAL: Server failed to start.", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
