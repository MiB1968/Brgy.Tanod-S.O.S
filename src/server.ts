import * as http from 'http';
import fs from 'fs';
import path from 'path';
import express from 'express';
import app from './server/app';
import { initDb } from './server/services/dbService';
import { initDatabase } from './server/db/index';
import { initSocket } from './server/sockets/index';
import { config } from './server/config/index';
import { errorHandler, notFoundHandler } from './server/middleware/error';

async function startServer() {
  console.log('[Server] Starting initialization sequence...');
  try {
    console.log('[Server] Initializing Firebase Admin...');
    initDatabase();
    if (config.databaseUrl) {
      console.log('[Server] Connecting to PostgreSQL/CockroachDB...');
      await initDb();
    } else {
      console.warn('WARNING: No DATABASE_URL provided. Skipping PostgreSQL initialization.');
    }
  } catch (err) {
    console.error('WARNING: Database initialization failed. Some features may not work.', err);
  }

  console.log('[Server] Creating HTTP server...');
  const server = http.createServer(app);

  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
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
    const distPath = path.resolve(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');

    console.log(`[Production] Booting in PRODUCTION mode.`);
    console.log(`[Production] Root: ${process.cwd()}`);
    console.log(`[Production] Assets: ${distPath}`);
    console.log(`[Production] Shell: ${indexPath}`);
    console.log(`[Production] Node: ${process.version}`);
    console.log(`[Production] DB Configured: ${!!config.databaseUrl}`);
    console.log(`[Production] Gemini Configured: ${!!config.geminiApiKey}`);

    if (!fs.existsSync(indexPath)) {
      console.error(`[Production] CRITICAL ERROR: index.html not found at ${indexPath}. Build may be broken.`);
    }

    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
          }
        }
      })
    );
    app.use(express.static(path.resolve(process.cwd(), 'public')));

    // Only serve index.html for non-API, non-socket.io requests
    app.get('*', (req, res, next) => {
      const isApi = req.path.startsWith('/api');
      const isSocket = req.path.startsWith('/socket.io');
      
      if (isApi || isSocket) {
        return next(); // Fall through to 404 handler or socket.io
      }

      console.log(`[Production] Serving SPA shell for: ${req.path}`);

      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`[Production] FAILED to serve index.html: ${err.message}`);
          res.status(500).send('Tactical Command Console offline. Build error.');
        }
      });
    });
  }

  console.log('[Server] Mounting final error handlers...');
  app.use(notFoundHandler);
  app.use(errorHandler);

  console.log(`[Server] Attempting to bind to port ${config.port} on 0.0.0.0...`);
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`
  ==================================================
  BRGY. TANOD S.O.S. - EMERGENCY PLATFORM
  ==================================================
  Server Status: OPERATIONAL
  Port: ${config.port}
  Environment: ${config.nodeEnv}
  Timestamp: ${new Date().toISOString()}
  ==================================================
    `);
  });
}

startServer().catch((err) => {
  console.error('FATAL: Server failed to start.', err);
  process.exit(1);
});
