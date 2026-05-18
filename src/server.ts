import * as http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import app from './server/app';
import { initDb } from './server/services/dbService';
import { initDatabase } from './server/db/index';
import { initSocket } from './server/sockets/index';
import { config } from './server/config/index';
import { errorHandler, notFoundHandler } from './server/middleware/error';

// ── Path Helper for ESM/CJS compatibility ──────────────────────────────────
const getDirname = () => {
  return path.dirname(fileURLToPath(import.meta.url));
};

async function startServer() {
  const PORT = Number(process.env.PORT) || config.port || 3000;
  console.log(`[Server] Booting Brgy. Tanod S.O.S...`);
  console.log(`[Server] PID: ${process.pid} | Port: ${PORT} | Mode: ${config.nodeEnv}`);
  console.log(`[Server] Database URL present: ${!!config.databaseUrl}`);
  console.log(`[Server] Gemini API Key present: ${!!config.geminiApiKey}`);
  
  try {
    console.log('[Server] Connecting to Tactical Persistence Layer...');
    initDatabase(); // Firebase
    
    if (config.databaseUrl) {
      // Connect to SQL DB with a reasonable timeout
      await Promise.race([
        initDb(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB connection timed out')), 15000))
      ]);
    } else {
      console.warn('WARNING: DATABASE_URL not set. Running in degraded mode.');
    }
  } catch (err) {
    console.error('ERROR: Initialization sequence failure:', err);
    // We continue booting so the container stays alive and serves the "Build broken" message
  }

  const server = http.createServer(app);

  process.on('uncaughtException', (err) => {
    console.error('CRITICAL: UNCAUGHT EXCEPTION:', err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('CRITICAL: UNHANDLED REJECTION:', reason);
  });

  initSocket(server);

  if (config.nodeEnv !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    app.use(vite.middlewares);
  } else {
    // Production Mode: Serve static files from /dist
    const distPath = getDirname();
    const indexPath = path.join(distPath, 'index.html');

    console.log(`[Production] Assets Root: ${distPath}`);
    
    if (!fs.existsSync(indexPath)) {
      console.error(`[Production] FATAL: index.html missing at ${indexPath}`);
    }

    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
          }
          // Support for WASM
          if (filePath.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
          }
        }
      })
    );
    
    // Serve /public as fallback if present in root
    const publicPath = path.resolve(process.cwd(), 'public');
    if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath));
    }

    // SPA fallback
    app.get('*', (req, res, next) => {
      // Exclude API and Socket
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }

      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`[Production] SPA Route Error (${req.path}):`, err);
          res.status(500).send('Tactical Command Console Offline. Build Incomplete.');
        }
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ==================================================
  BRGY. TANOD S.O.S. - BATTLE-READY
  ==================================================
  Status: ONLINE
  Address: http://0.0.0.0:${PORT}
  Mode: ${config.nodeEnv}
  Timestamp: ${new Date().toISOString()}
  ==================================================
    `);
  });
}

startServer().catch((err) => {
  console.error('FATAL: Startup sequence failed. Container exiting.', err);
  process.exit(1);
});

