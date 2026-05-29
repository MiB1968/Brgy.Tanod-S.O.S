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

export const setupRoutes = (app: Express): void => {
  // Health check - Detailed for System Audit
  app.get("/api/health", async (req, res) => {
    const { checkConnection } = await import('../db/index');
    const { backgroundTasksService } = await import('../services/backgroundTasksService');
    const dbConnected = await checkConnection();
    
    res.json({
      success: true,
      status: dbConnected ? 'operational' : 'degraded',
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
        backgroundTasks: backgroundTasksService.getStatus().isRunning ? 'active' : 'inactive',
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeEnv: process.env.NODE_ENV || 'development',
      },
      timestamp: new Date().toISOString(),
      message: "Brgy. Tanod S.O.S. Operations Center Backend",
    });
  });

  // Feature routes
  app.use("/api/auth", authRoutes);
  app.use("/api/sos", sosRoutes);
  app.use("/api/intelligence", intelligenceRoutes);
  app.use("/api/sync", syncRoutes);
  app.use("/api/system", systemRoutes);
  app.use("/api/voice", voiceRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/tts", ttsRoutes);
  app.use("/api/storage", storageRoutes);
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/sms", smsRoutes);
  app.use("/api/otp", otpRoutes);
  app.use("/api/scrape", scrapeRoutes);

  // 404 catch-all for unmatched API routes
  app.all("/api/*", (req, res) => {
    console.warn(`[404] Unhandled API request: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: `API endpoint not found: ${req.method} ${req.originalUrl}` },
    });
  });
};
