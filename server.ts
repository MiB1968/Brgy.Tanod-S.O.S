import * as http from 'http';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import app from './server/app';
import { initDb } from './server/services/dbService';
import { initSocket } from './server/sockets/index';
import { config } from './server/config/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // 1. Initialize Database
  try {
    await initDb();
  } catch (err) {
    console.error("CRITICAL: Database initialization failed.", err);
    // Continue for now, but in real production you might want to exit
  }

  const server = http.createServer(app);

  // 2. Initialize Sockets
  initSocket(server);

  // 3. Vite development middleware or static production serving
  if (config.nodeEnv !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist/client');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  // 4. Error Handling (Must be after all routes and middleware)
  const { errorHandler, notFoundHandler } = await import('./server/middleware/error');
  app.use(notFoundHandler);
  app.use(errorHandler);

  // 5. Start Server
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

startServer().catch(err => {
  console.error("FATAL: Server failed to start.", err);
  process.exit(1);
});
