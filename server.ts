import * as http from 'http';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import app from './src/server/app';
import { initDb } from './src/server/services/dbService';
import { initSocket } from './src/server/sockets/index';
import { config } from './src/server/config/index';

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

  // 3. Serve Static Files in Production
  if (config.nodeEnv === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // Avoid intercepting API routes (already handled by app.use above)
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  // 4. Start Server
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
