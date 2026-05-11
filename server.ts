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
    console.error("CRITICAL: Database initialization failed. Server cannot start safely.", err);
    process.exit(1);
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
    const distPath = path.resolve(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    
    console.log(`[Production] Environment detected.`);
    console.log(`[Production] System Root: ${process.cwd()}`);
    console.log(`[Production] Target Asset Directory: ${distPath}`);
    
    // Static assets first
    app.use(express.static(distPath, {
      index: false, // Don't automatically serve index.html from here, we will handle it via *
      setHeaders: (res, path) => {
        if (path.endsWith('.js') || path.endsWith('.css')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
      }
    }));

    app.get('*', (req, res) => {
      // Don't intercept API calls
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'API endpoint not found' });
      }
      
      console.log(`[Production] Serving fallback shell for: ${req.path}`);
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`[Production] FAILED to serve index.html from ${indexPath}: ${err.message}`);
          res.status(500).send(`
            <div style="font-family: monospace; padding: 20px; background: #000; color: #f00;">
              <h1>SYSTEM BOOT ERROR</h1>
              <p>Application shell not found at: ${indexPath}</p>
              <p>Please ensure 'npm run build' has completed and 'dist/client' is populated.</p>
            </div>
          `);
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
