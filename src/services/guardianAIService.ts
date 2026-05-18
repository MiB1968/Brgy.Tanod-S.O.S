// src/services/guardianAIService.ts
// CLIENT-SIDE — powered by WebLLM (runs 100% in browser, no API key needed)

import { getWebLLMEngine, setWebLLMProgressCallback, isWebLLMReady, promptWebLLM } from '../lib/webllm';

export interface GuardianContext {
  pendingSOS: number;
  activeTanods: number;
  isSuperAdmin: boolean;
}

export interface GuardianResponse {
  reply: string;
  action?: 'SUMMARIZE' | 'SUGGEST_DISPATCH' | 'STATUS_REPORT' | 'HELP';
}

type ProgressCallback = (progress: number, text: string) => void;

export function setGuardianProgressCallback(cb: ProgressCallback) {
  setWebLLMProgressCallback(cb);
}

// ── Main Service ─────────────────────────────────────────────────────────────

class GuardianAIService {
  /**
   * Preload the model in the background so it's ready when needed.
   * Call this early (e.g., when admin dashboard mounts).
   */
  public preload(onProgress?: ProgressCallback) {
    if (onProgress) setGuardianProgressCallback(onProgress);
    getWebLLMEngine().catch((err) =>
      console.warn("[Guardian AI] Preload failed:", err)
    );
  }

  /**
   * Returns true if the model is ready to use.
   */
  public isReady(): boolean {
    return isWebLLMReady();
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
        getWebLLMEngine(),
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
        !isWebLLMReady()
          ? "Guardian AI is loading. Please wait a moment before sending commands."
          : "Acknowledged. Standing by for tactical instructions.",
    };
  }

  /**
   * Automatically classify an incident based on its description.
   */
  public async classifyIncident(description: string): Promise<string> {
    if (!isWebLLMReady() || !description.trim()) return "";

    const systemPrompt = "Identify the incident category from the description. Output ONLY ONE WORD from this list: Theft, Physical Injury, Noise Complaint, Fire, Medical, Others.";
    try {
        const result = await promptWebLLM(systemPrompt, description);
        const clean = result.replace(/[.]/g, "").trim();
        const valid = ["Theft", "Physical Injury", "Noise Complaint", "Fire", "Medical", "Others"];
        return valid.find(v => clean.toLowerCase().includes(v.toLowerCase())) || "Others";
    } catch {
        return "Others";
    }
  }

  /**
   * Summarize a collection of incidents for a shift handover report.
   */
  public async summarizeShift(incidents: any[]): Promise<string> {
    if (!isWebLLMReady()) return "AI Model loading. Cannot summarize shift yet.";
    if (incidents.length === 0) return "No incidents recorded during this shift. Overall status: Quiet and Clear.";

    const incidentList = incidents.map(i => `- ${i.type} at ${i.location}: ${i.description}`).join('\n');
    const systemPrompt = "You are a Barangay Tanod Shift Commander. Summarize the following shift incidents into a concise professional report for the next shift. Use a mix of Tagalog and English. Start with 'SHIFT SUMMARY:'";
    
    try {
        return await promptWebLLM(systemPrompt, incidentList);
    } catch (e) {
        return "Failed to generate summary. Please review logs manually.";
    }
  }

  /**
   * Extract SOS details from a voice transcript or text.
   */
  public async extractSOSDetails(text: string): Promise<{ type: string, location: string, severity: number }> {
    if (!isWebLLMReady()) return { type: 'Others', location: 'Unknown', severity: 3 };

    const systemPrompt = `Extract emergency details from the following report. 
    Output ONLY a JSON object like: {"type": "FIRE|MEDICAL|CRIME|FLOOD|OTHERS", "location": "string", "severity": 1-5}
    - FIRE: sunog, apoy
    - MEDICAL: sakit, nahimatay, sugat
    - CRIME: nanakawan, away, gulo
    - FLOOD: baha
    Report: `;

    try {
        const raw = await promptWebLLM(systemPrompt, text);
        const match = raw.match(/\{.*\}/s);
        if (match) return JSON.parse(match[0]);
    } catch (e) {
        console.error("SOS Extraction failed:", e);
    }
    return { type: 'Others', location: 'Unknown', severity: 3 };
  }

  /**
   * Provide offline First Aid or emergency instructions.
   */
  public async generateFirstAid(type: string): Promise<string> {
    if (!isWebLLMReady()) return "Guardian AI is loading. Please follow standard emergency procedures.";

    const systemPrompt = "You are a first-aid expert. Provide 3-5 immediate, life-saving steps in Tagalog for the following emergency type. Be direct and clear.";
    return await promptWebLLM(systemPrompt, type);
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
