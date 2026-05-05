import express from "express";
import * as http from "http";
import path from "path";
import { z } from "zod";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Create HTTP server
  const server = http.createServer(app);

  app.use(express.json());

  // -----------------------------
  // HTTP Endpoints
  // -----------------------------
  
  const smsSchema = z.object({
    to: z.string(),
    message: z.string()
  });

  app.post("/api/sms", async (req, res) => {
    const result = smsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const { to, message } = result.data;
    const apiKey = process.env.SEMAPHORE_API_KEY;

    if (!apiKey) {
      console.log('SMS Simulation (No Key):', { to, message });
      return res.json({ success: true, simulated: true });
    }

    try {
      const response = await fetch('https://api.semaphore.co/api/v4/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          apikey: apiKey,
          number: to,
          message: message,
        }),
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "RUNNING", message: "Brgy Tanod GPS Live (Node.js)" });
  });

  // Vite middleware for development
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
