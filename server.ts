import * as http from 'http';
import path from 'path';
import express from 'express';
import app from './src/server/app';
import { initDb } from './src/server/services/dbService';
import { initDatabase } from './src/server/db/index';
import { initSocket } from './src/server/sockets/index';
import { config } from './src/server/config/index';

async function startServer() {
  try {
    initDatabase();
    await initDb();
  } catch (err) {
    console.error('CRITICAL: Database initialization failed. Server cannot start safely.', err);
    process.exit(1);
  }

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

    console.log(`[Production] Environment detected.`);
    console.log(`[Production] System Root: ${process.cwd()}`);
    console.log(`[Production] Target Asset Directory: ${distPath}`);

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

    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({
          success: false,
          error: 'API endpoint not found'
        });
      }

      console.log(`[Production] Serving fallback shell for: ${req.path}`);

      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`[Production] FAILED to serve index.html from ${indexPath}: ${err.message}`);

          res.status(500).json({
            success: false,
            error: 'Application initialization error',
            details: 'Application shell could not be served.'
          });
        }
      });
    });
  }

  const { errorHandler, notFoundHandler } = await import('./src/server/middleware/error');
  
  app.use(notFoundHandler);
  app.use(errorHandler);

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
