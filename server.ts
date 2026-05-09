import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import * as http from "http";
import path from "path";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "" ? process.env.GEMINI_API_KEY.trim() : null;
const API_SECRET = process.env.API_SECRET_KEY;

// Initialize AI without an empty API key
const ai = apiKey ? new GoogleGenAI({ apiKey }) : new GoogleGenAI({});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://unpkg.com",
          "https://tile.openstreetmap.org",
          "https://*.tile.openstreetmap.org",
          "https://placehold.co",
          "https://raw.githubusercontent.com",
          "https://cdnjs.cloudflare.com",
          "https://www.google.com",
          "https://api.qrserver.com"
        ],
        fontSrc: ["'self'", "data:", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
        mediaSrc: ["'self'", "https://assets.mixkit.co"],
        connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: "deny" },
  }));
  app.use(express.json());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 100, 
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
  app.use("/api/", limiter);

  // Simple API Key Auth
  app.use("/api/", (req, res, next) => {
    if (API_SECRET && req.headers['x-api-key'] !== API_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  });

  // Helper to run AI model
  async function runAiRequest(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });
      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    } catch (error: any) {
      console.error("AI Request failed:", error.message);
      throw error;
    }
  }

  // Create HTTP server
  const server = http.createServer(app);

  // -----------------------------
  // HTTP Endpoints
  // -----------------------------

  const aiAnalysisSchema = z.object({
    description: z.string(),
    initialType: z.string().optional()
  });

  app.post("/api/ai/analyze", async (req, res) => {
    const check = aiAnalysisSchema.safeParse(req.body);
    if (!check.success) return res.status(400).json({ error: check.error });

    const { description, initialType } = check.data;

    const prompt = `
      Analyze the following Philippine barangay emergency SOS description and categorize it. 
      Initial reported type: ${initialType || 'Unknown'}
      Description: ${description}
      
      Respond in strict JSON format with exactly:
      {
        "incidentType": "MEDICAL" | "FIRE" | "CRIME" | "DISTURBANCE" | "OTHER",
        "severityScore": number (1-10),
        "urgency": "LOW" | "NORMAL" | "HIGH" | "CRITICAL",
        "summary": "1-sentence tactical summary",
        "recommendedResponders": ["Tanod", "BFP", etc],
        "riskFactors": ["factor 1", "factor 2"]
      }
    `;

    try {
      const text = await runAiRequest(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Format failure");
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      res.status(500).json({ 
        error: "Analysis engine failed after multiple retries",
        details: error.message 
      });
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

  // Custom route for service worker to ensure to always fetch the latest version
  app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    if (process.env.NODE_ENV !== "production") {
        res.sendFile(path.join(process.cwd(), 'public', 'sw.js'));
    } else {
        res.sendFile(path.join(process.cwd(), 'dist', 'sw.js'));
    }
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
    const publicPath = path.join(process.cwd(), 'public');
    
    // Serve from dist first, then public as fallback
    app.use(express.static(distPath));
    app.use(express.static(publicPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
