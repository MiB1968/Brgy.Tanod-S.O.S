import * as http from 'http';
import path from 'path';
import express from 'express';
import app from './src/server/app';
import { initDb } from './src/server/services/dbService';
import { initDatabase } from './src/server/db/index';
import { initSocket } from './src/server/sockets/index';
import { config } from './src/server/config/index';

async function startServer() {
  // 1. Initialize Database
  try {
    initDatabase();
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
    const distPath = path.resolve(process.cwd(), 'dist/client');
    console.log(`[Production] Serving static files from: ${distPath}`);
    
    // Safety check: verify dist/client exists
    import('fs').then(fs => {
      if (!fs.existsSync(distPath)) {
        console.error(`ERROR: Static assets directory not found at ${distPath}. Build might have failed.`);
      } else {
        console.log(`[Production] Verified: dist/client exists at ${distPath}`);
      }
    });

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // Don't intercept API calls
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'API endpoint not found' });
      }
      
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`Error sending index.html: ${err.message}`);
          res.status(500).send("Application shell not found. Please ensure 'npm run build' completed successfully.");
        }
      });
    });
  }

  // 4. Error Handling (Must be after all routes and middleware)
  const { errorHandler, notFoundHandler } = await import('./src/server/middleware/error');
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
