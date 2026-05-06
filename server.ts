import express from "express";
import * as http from "http";
import path from "path";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Create HTTP server
  const server = http.createServer(app);

  app.use(express.json());

  // -----------------------------
  // HTTP Endpoints
  // -----------------------------

  const jarvisSchema = z.object({
    transcript: z.string(),
    userId: z.string(),
    role: z.string()
  });

  app.post("/api/jarvis/command", async (req, res) => {
    const check = jarvisSchema.safeParse(req.body);
    if (!check.success) return res.status(400).json({ error: check.error });

    const { transcript, role } = check.data;

    const prompt = `
      You are JARVIS, an AI Emergency Response Assistant for Brgy. Tanod S.O.S.
      The user (Role: ${role}) said: "${transcript}"

      Analyze the intent and return a JSON object with:
      - action: "TOGGLE_SIREN" | "REQUEST_BACKUP" | "RESOLVE_INCIDENT" | "STATUS_CHECK" | "ESCALATE" | "UNKNOWN"
      - response: A concise, professional voice response in English (e.g. "Siren activated, sir.")
      - payload: Any relevant data (e.g. { value: true/false } for siren)

      Constraint: 
      - Only 'admin' or 'tanod' can TOGGLE_SIREN or ESCALATE.
      - If unauthorized, return action: "UNKNOWN" and response: "I am sorry, you do not have permission for that protocol."

      Return ONLY pure JSON.
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      // Simple JSON extraction from markdown
      const jsonStr = text.replace(/```json|```/g, "").trim();
      const jarvisResponse = JSON.parse(jsonStr);
      res.json(jarvisResponse);
    } catch (error) {
      console.error("Jarvis Error:", error);
      res.status(500).json({ error: "Jarvis brain is offline" });
    }
  });
  
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
