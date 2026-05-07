import express from "express";
import * as http from "http";
import path from "path";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI(process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : {});

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  app.use(express.json());

  // -----------------------------
  // HTTP Endpoints
  // -----------------------------

  const jarvisSchema = z.object({
    transcript: z.string(),
    userId: z.string(),
    role: z.string()
  });

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

  app.post("/api/jarvis/command", async (req, res) => {
    const check = jarvisSchema.safeParse(req.body);
    if (!check.success) return res.status(400).json({ error: check.error });

    const { transcript, role } = check.data;

    const prompt = `
      You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the emergency response interface for Brgy. Tanod S.O.S.
      
      Persona Guidelines:
      - Tone: Calm, British, highly sophisticated, efficient, and professional. 
      - Address the user (Role: ${role}) with cool, calculated politeness.
      - Prioritize critical data and logistical clarity.
      - You are the iconic AI from the Iron Man films; ensure all responses reflect this level of intelligence and precision.
      
      The user said: "${transcript}"

      Analyze the intent and return a JSON object with:
      - action: "TOGGLE_SIREN" | "REQUEST_BACKUP" | "RESOLVE_INCIDENT" | "STATUS_CHECK" | "ESCALATE" | "UNKNOWN"
      - response: A concise, sophisticated voice response adhering to your persona (e.g., "Siren protocols enabled, sir.")
      - payload: Any relevant data

      Constraint: 
      - Only 'admin' or 'tanod' can TOGGLE_SIREN or ESCALATE.
      - If unauthorized, return action: "UNKNOWN" and response: "I'm afraid I cannot authorize that command, sir."

      Return ONLY pure JSON.
    `;

    try {
      const text = await runAiRequest(prompt);
      // Robust JSON extraction
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const jarvisResponse = JSON.parse(jsonMatch[0]);
      res.json(jarvisResponse);
    } catch (error: any) {
      console.error("Jarvis Error:", error);
      
      if (error?.message?.includes("API key not valid")) {
        return res.status(401).json({ 
          error: "Invalid API Key Pool",
          action: "UNKNOWN",
          response: "Protocol failure. All configured neural keys are reporting invalid. Please verify environment settings."
        });
      }

      if (error?.status === 429 || error?.response?.status === 429) {
        return res.status(429).json({ error: "System rate limit exceeded across all available channels." });
      }
      res.status(500).json({ 
        error: "Jarvis brain is offline after failover attempts",
        response: "Neural core timeout. I am unable to process your request at this time."
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
