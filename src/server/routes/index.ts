import { Express } from "express";
import authRoutes from "./authRoutes";
import sosRoutes from "./sosRoutes";
import intelligenceRoutes from "./intelligenceRoutes";
import syncRoutes from "./syncRoutes";
import systemRoutes from "./systemRoutes";
import voiceRoutes from "./voiceRoutes";
import aiRoutes from "./aiRoutes";
import adminRoutes from "./adminRoutes";
import ttsRoutes from "./ttsRoutes";
import storageRoutes from "./storageRoutes";
import webhookRoutes from "./webhookRoutes";
import smsRoutes from "./sms";
import otpRoutes from "./otp";
import scrapeRoutes from "./scrape";
import residentRoutes from "./residentRoutes";
import { requireAppCheck } from "../middleware/requireAppCheck";

export const setupRoutes = (app: Express): void => {
  // Health check - Detailed for System Audit (No App Check required)
  app.get("/api/health", async (req, res) => {
    const { checkConnection } = await import('../db/index');
    const { backgroundTasksService } = await import('../services/backgroundTasksService');
    const dbConnected = await checkConnection();
    
    res.json({
      success: true,
      status: dbConnected ? 'operational' : 'degraded',
      timestamp: new Date().toISOString(),
      message: "Brgy. Tanod S.O.S. Operations Center Backend",
    });
  });

  // Apply App Check Middleware globally to most API routes
  // (Webhooks should bypass if they come from external services, e.g. Twilio)
  // Let's add it carefully.
  app.use("/api/auth", requireAppCheck, authRoutes);
  app.use("/api/sos", requireAppCheck, sosRoutes);
  app.use("/api/intelligence", requireAppCheck, intelligenceRoutes);
  app.use("/api/sync", requireAppCheck, syncRoutes);
  app.use("/api/system", requireAppCheck, systemRoutes);
  app.use("/api/voice", requireAppCheck, voiceRoutes);
  app.use("/api/ai", requireAppCheck, aiRoutes);
  app.use("/api/admin", requireAppCheck, adminRoutes);
  app.use("/api/tts", requireAppCheck, ttsRoutes);
  app.use("/api/storage", requireAppCheck, storageRoutes);
  
  // Exclude webhooks or apply individually if needed. Twilio won't have Firebase App Check tokens.
  app.use("/api/webhooks", webhookRoutes); 
  
  // Exclude SMS fallback or endpoints hit from external/Twilio. Let's keep sms routes open or appCheck them? 
  // Normally /api/sms might be webhook callbacks or internal, let's just leave it for now or rely on API key
  app.use("/api/sms", smsRoutes);
  
  app.use("/api/otp", requireAppCheck, otpRoutes);
  app.use("/api/scrape", requireAppCheck, scrapeRoutes);
  app.use("/api/residents", requireAppCheck, residentRoutes);

  // 404 catch-all for unmatched API routes
  app.all("/api/*", (req, res) => {
    console.warn(`[404] Unhandled API request: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: `API endpoint not found: ${req.method} ${req.originalUrl}` },
    });
  });
};
