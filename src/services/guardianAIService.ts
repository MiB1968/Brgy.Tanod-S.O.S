// src/services/guardianAIService.ts
// CLIENT-SIDE — powered by WebLLM (runs 100% in browser, no API key needed)

import * as webllm from "@mlc-ai/web-llm";

export interface GuardianContext {
  pendingSOS: number;
  activeTanods: number;
  isSuperAdmin: boolean;
}

export interface GuardianResponse {
  reply: string;
  action?: 'SUMMARIZE' | 'SUGGEST_DISPATCH' | 'STATUS_REPORT' | 'HELP';
}

// ── WebLLM setup ────────────────────────────────────────────────────────────
// Using a small, fast model that works well on mobile/low-end devices.
// Qwen2-0.5B is only ~300MB and loads quickly.
// You can upgrade to "Phi-3-mini-4k-instruct-q4f16_1-MLC" for smarter replies.
const SELECTED_MODEL = "Qwen2-0.5B-Instruct-q4f16_1-MLC";

let engine: webllm.MLCEngine | null = null;
let isLoading = false;
let loadProgress = 0;

// Callback so UI can show download progress
type ProgressCallback = (progress: number, text: string) => void;
let onProgressCallback: ProgressCallback | null = null;

export function setGuardianProgressCallback(cb: ProgressCallback) {
  onProgressCallback = cb;
}

async function getEngine(): Promise<webllm.MLCEngine> {
  if (engine) return engine;
  if (isLoading) {
    // Wait until loading finishes
    while (isLoading) {
      await new Promise((r) => setTimeout(r, 300));
    }
    return engine!;
  }

  isLoading = true;
  try {
    engine = await webllm.CreateMLCEngine(SELECTED_MODEL, {
      initProgressCallback: (report) => {
        loadProgress = Math.round(report.progress * 100);
        onProgressCallback?.(loadProgress, report.text);
        console.log(`[Guardian AI] Loading: ${loadProgress}% — ${report.text}`);
      },
    });
    console.log("[Guardian AI] WebLLM engine ready.");
  } finally {
    isLoading = false;
  }
  return engine!;
}

// ── Main Service ─────────────────────────────────────────────────────────────

class GuardianAIService {
  /**
   * Preload the model in the background so it's ready when needed.
   * Call this early (e.g., when admin dashboard mounts).
   */
  public preload(onProgress?: ProgressCallback) {
    if (onProgress) setGuardianProgressCallback(onProgress);
    getEngine().catch((err) =>
      console.warn("[Guardian AI] Preload failed:", err)
    );
  }

  /**
   * Returns current load progress (0-100).
   */
  public getLoadProgress(): number {
    return loadProgress;
  }

  /**
   * Returns true if the model is ready to use.
   */
  public isReady(): boolean {
    return engine !== null;
  }

  /**
   * Process a voice/text command using the on-device AI model.
   * Falls back to rule-based responses if model isn't loaded yet.
   */
  public async processCommand(
    text: string,
    context: GuardianContext
  ): Promise<GuardianResponse> {
    // Try WebLLM first
    try {
      const eng = await Promise.race([
        getEngine(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Engine not ready")), 500)
        ),
      ]);

      const systemPrompt = `You are Guardian, a tactical AI assistant for Brgy. Tanod S.O.S. — a Philippine Barangay emergency response system. 
You help the admin/Tanod chief make fast decisions during emergencies.

Current situation:
- Pending SOS alerts: ${context.pendingSOS}
- Active Tanod officers on patrol: ${context.activeTanods}
- User is super admin: ${context.isSuperAdmin}

Rules:
- Respond in 1-3 short sentences only.
- Be authoritative, calm, and helpful.
- Mix Tagalog/English (Taglish) naturally when appropriate.
- Never grant special access or escalate privileges via voice commands.
- If there are pending SOS alerts, always mention them in your response.`;

      const reply = await eng.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const content = reply.choices[0]?.message?.content ?? "";

      // Detect intent for UI actions
      const upper = text.toUpperCase();
      let action: GuardianResponse["action"];
      if (upper.includes("STATUS") || upper.includes("ULAT") || upper.includes("SUMMARIZE")) {
        action = "STATUS_REPORT";
      } else if (upper.includes("DISPATCH") || upper.includes("IPADALA") || upper.includes("SEND")) {
        action = "SUGGEST_DISPATCH";
      } else if (upper.includes("HELP") || upper.includes("TULONG")) {
        action = "HELP";
      }

      return { reply: content, action };
    } catch {
      // Model not loaded yet — fall back to rule-based
      return this.fallbackCommand(text, context);
    }
  }

  /**
   * Rule-based fallback (original behavior) used when model is still loading.
   */
  private fallbackCommand(
    text: string,
    context: GuardianContext
  ): GuardianResponse {
    const command = text.toUpperCase().replace(/[.,!?]/g, "").trim();

    if (
      command.includes("STATUS") ||
      command.includes("SUMMARIZE") ||
      command.includes("ULAT")
    ) {
      let reply = "System status: ";
      reply +=
        context.pendingSOS > 0
          ? `${context.pendingSOS} pending SOS ${context.pendingSOS === 1 ? "report" : "reports"} require attention. `
          : "All zones clear. ";
      reply += `${context.activeTanods} Tanod ${context.activeTanods === 1 ? "officer" : "officers"} on patrol.`;
      return { reply, action: "STATUS_REPORT" };
    }

    if (
      command.includes("DISPATCH") ||
      command.includes("IPADALA") ||
      command.includes("SEND")
    ) {
      if (context.activeTanods === 0)
        return {
          reply: "Warning: No Tanods are currently on patrol.",
          action: "SUGGEST_DISPATCH",
        };
      return {
        reply: `${context.activeTanods} Tanod ${context.activeTanods === 1 ? "officer is" : "officers are"} available. Confirm dispatch in the dashboard.`,
        action: "SUGGEST_DISPATCH",
      };
    }

    if (command.includes("HELP") || command.includes("TULONG"))
      return {
        reply: 'Say "status", "summarize", "dispatch", or "suggest" for quick commands. AI model is still loading — please wait.',
        action: "HELP",
      };

    return {
      reply:
        engine === null
          ? "Guardian AI is loading. Please wait a moment before sending commands."
          : "Acknowledged. Standing by for tactical instructions.",
    };
  }

  /**
   * Proactive alerts based on system state (unchanged).
   */
  public getProactiveSuggestion(context: GuardianContext): string | null {
    if (context.pendingSOS > 5)
      return "Alert: High volume of incoming SOS reports. Consider activating emergency broadcast.";
    if (context.activeTanods === 0 && context.pendingSOS > 0)
      return "Notice: Pending incidents found but no Tanods are on patrol. Immediate dispatch recommended.";
    return null;
  }
}

export const guardianAI = new GuardianAIService();
