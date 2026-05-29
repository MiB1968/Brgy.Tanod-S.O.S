import * as http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import app from "./server/app";
import { initDb } from "./server/services/dbService";
import { initDatabase } from "./server/db/index";
import { initSocket } from "./server/sockets/index";
import { config } from "./server/config/index";
import { telegramService } from "./server/services/telegramService";
import { backgroundTasksService } from "./server/services/backgroundTasksService";
import { errorHandler, notFoundHandler } from "./server/middleware/error";

// ── Path Helper for ESM/CJS compatibility ──────────────────────────────────
const getDirname = () => {
  if (typeof __dirname !== "undefined") return __dirname;
  try {
    return path.dirname(fileURLToPath((import.meta as any).url));
  } catch {
    return process.cwd();
  }
};

async function startServer() {
  const PORT = 3000;
  const currentDir = getDirname();
  const rootDir = process.cwd();
  
  // Create a new master Express app to properly orchestrate Vite and the backend app
  const masterApp = express();

  // Robust production detection
  const isRunningFromDist = currentDir.includes("dist");
  const isProd = process.env.NODE_ENV === "production" || isRunningFromDist;
  
  console.log(`[Server] Booting Brgy. Tanod S.O.S...`);
  console.log(`[Server] PID: ${process.pid} | Port: ${PORT} | Mode: ${isProd ? "production" : "development"}`);
  
  // API and backend app setup
  // We initialize Firebase early as it's fast, but defer migrations until port is open
  initDatabase();

  // Health checks and other routes that should be FAST can go here
  masterApp.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      mode: isProd ? "production" : "development",
      timestamp: new Date().toISOString()
    });
  });
  masterApp.get("/ping", (req, res) => res.send(`PONG - ${new Date().toISOString()}`));

  // MOUNT THE BACKEND APP FIRST (SO /api ENDPOINTS ARE INTERCEPTED FIRST)
  // Only apply helmet in production to avoid blocking dev resources or causing CSP issues in iframe
  masterApp.use(app);

  let vite: any;
  if (!isProd) {
    console.log("[Server] Starting in DEVELOPMENT mode (Vite middleware)");
    
    // Request logging for dev (Master App level) - Skip source files noise
    masterApp.use((req, res, next) => {
      if (!req.url.includes('node_modules') && !req.url.includes('@vite') && !req.url.startsWith('/src/')) {
        console.log(`[Dev Request] ${req.method} ${req.url}`);
      }
      next();
    });

    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      root: rootDir,
      logLevel: "silent",
      server: { middlewareMode: true, hmr: false },
      appType: "custom", // Changed from spa to custom for better control in middleware mode
    });

    // VITE MIDDLEWARE SECOND
    masterApp.use(vite.middlewares);
  }

  if (!isProd) {
    // Explicitly serve service workers in dev
    masterApp.get("/sw.js", (req, res) => {
      const swPath = path.join(rootDir, "public", "sw.js");
      if (fs.existsSync(swPath)) {
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Service-Worker-Allowed", "/");
        res.sendFile(swPath);
      } else {
        res.status(404).send("sw.js not found");
      }
    });

    masterApp.get("/firebase-messaging-sw.js", (req, res) => {
      const swPath = path.join(rootDir, "public", "firebase-messaging-sw.js");
      if (fs.existsSync(swPath)) {
        res.setHeader("Content-Type", "application/javascript");
        res.sendFile(swPath);
      } else {
        res.status(404).send("firebase-messaging-sw.js not found");
      }
    });

    // SPA Fallback for Development
    masterApp.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/socket.io')) {
        return next();
      }
      
      const pathname = new URL(req.originalUrl, `http://${req.headers.host}`).pathname;
      if (path.extname(pathname).length > 0) {
        return next();
      }

      try {
        const template = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production Mode: Serve static files
    const distPath = isRunningFromDist ? currentDir : path.join(rootDir, "dist");
    const indexPath = path.join(distPath, "index.html");

    masterApp.use(express.static(distPath, { index: false }));
    const publicPath = path.join(rootDir, "public");
    if (fs.existsSync(publicPath)) {
      masterApp.use(express.static(publicPath));
    }

    masterApp.get("/firebase-messaging-sw.js", (req, res) => {
      const swPath = path.join(distPath, "firebase-messaging-sw.js");
      if (fs.existsSync(swPath)) {
        res.setHeader("Content-Type", "application/javascript");
        res.sendFile(swPath);
      } else {
        res.status(404).send("Service Worker not found");
      }
    });

    masterApp.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
        return next();
      }
      res.sendFile(indexPath, (err) => {
        if (err) res.status(500).send("Tactical Command Console Offline.");
      });
    });
  }

  const server = http.createServer(masterApp);
  initSocket(server);

  server.listen(PORT, "0.0.0.0", async () => {
    console.log(`[Server] Port ${PORT} is open. Finalizing tactical initialization...`);

    // Run heavy initialization after port is open to satisfy Cloud Run startup probes
    try {
      if (config.databaseUrl) {
        console.log("[Server] Syncing SQL Persistence...");
        await initDb().catch(e => console.warn("SQL Sync warning:", e.message));
      }
      
      // Initialize Webhooks if on live URL
      const appUrl = process.env.APP_URL;
      if (appUrl && process.env.TELEGRAM_BOT_TOKEN) {
        console.log("[Server] Registering Telegram Command Webhook...");
        await telegramService.setWebhook(appUrl);
      }
      
      // Initialize Multi-service Background Daemons
      backgroundTasksService.initialize();
    } catch (err) {
      console.error("Initialization warning:", err);
    }

    console.log(`
  ==================================================
  BRGY. TANOD S.O.S. - BATTLE-READY
  ==================================================
  Status: ONLINE
  Address: http://0.0.0.0:${PORT}
  Mode: ${isProd ? 'Production' : 'Development'}
  Timestamp: ${new Date().toISOString()}
  ==================================================
    `);
  });
}

startServer().catch((err) => {
  console.error("FATAL: Startup sequence failed. Container exiting.", err);
  process.exit(1);
});
