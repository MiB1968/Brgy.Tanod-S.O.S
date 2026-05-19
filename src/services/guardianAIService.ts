// src/services/guardianAIService.ts
import { fetchAPI } from '../lib/api';

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

class GuardianAIServiceBackend {
  public preload(onProgress?: ProgressCallback) {
    if (onProgress) {
        onProgress(1, "Guardian AI Connected to Server");
    }
  }

  public isReady(): boolean {
    return true; // Server-side AI is always considered ready to accept requests
  }

  public async processCommand(
    text: string,
    context: GuardianContext
  ): Promise<GuardianResponse> {
    try {
      const response = await fetchAPI('/ai/guardian', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      
      const content = response.response || "";
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
      return this.fallbackCommand(text, context);
    }
  }

  private fallbackCommand(text: string, context: GuardianContext): GuardianResponse {
    const command = text.toUpperCase().replace(/[.,!?]/g, "").trim();

    if (command.includes("STATUS") || command.includes("SUMMARIZE") || command.includes("ULAT")) {
      let reply = "System status: ";
      reply += context.pendingSOS > 0
          ? `${context.pendingSOS} pending SOS ${context.pendingSOS === 1 ? "report" : "reports"} require attention. `
          : "All zones clear. ";
      reply += `${context.activeTanods} Tanod ${context.activeTanods === 1 ? "officer" : "officers"} on patrol.`;
      return { reply, action: "STATUS_REPORT" };
    }

    if (command.includes("DISPATCH") || command.includes("IPADALA") || command.includes("SEND")) {
      if (context.activeTanods === 0)
        return { reply: "Warning: No Tanods are currently on patrol.", action: "SUGGEST_DISPATCH" };
      return {
        reply: `${context.activeTanods} Tanod ${context.activeTanods === 1 ? "officer is" : "officers are"} available. Confirm dispatch in the dashboard.`,
        action: "SUGGEST_DISPATCH",
      };
    }

    if (command.includes("HELP") || command.includes("TULONG"))
      return { reply: 'Say "status", "summarize", "dispatch", or "suggest" for quick commands.', action: "HELP" };

    return { reply: "Acknowledged. Standing by for tactical instructions." };
  }

  public async classifyIncident(description: string): Promise<string> {
    if (!description.trim()) return "Others";
    try {
        const response = await fetchAPI('/ai/analyze', {
          method: 'POST',
          body: JSON.stringify({ description })
        });
        const map: Record<string, string> = {
            "MEDICAL": "Medical",
            "FIRE": "Fire",
            "CRIME": "Crime",
            "DISTURBANCE": "Noise Complaint",
            "NATURAL_DISASTER": "Flood",
            "OTHER": "Others"
        };
        return map[response.analysis.incidentType] || "Others";
    } catch {
        return "Others";
    }
  }

  public async summarizeShift(incidents: any[]): Promise<string> {
    if (incidents.length === 0) return "No incidents recorded during this shift. Overall status: Quiet and Clear.";

    const incidentList = incidents.map(i => `- ${i.type} at ${i.location}: ${i.description}`).join('\n');
    try {
        const response = await fetchAPI('/ai/summarize', {
          method: 'POST',
          body: JSON.stringify({ incidentNotes: incidentList })
        });
        return response.summary || "Summary generated but empty.";
    } catch (e) {
        return "Failed to generate summary. Please review logs manually.";
    }
  }

  public async extractSOSDetails(text: string): Promise<{ type: string, location: string, severity: number }> {
    try {
      const response = await fetchAPI('/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({ description: text })
      });
      return {
          type: response.analysis.incidentType || 'OTHER',
          location: 'Auto-detected',
          severity: Math.ceil((response.analysis.severityScore || 5) / 2) // scale 1-10 to 1-5
      };
    } catch (e) {
      console.error("SOS Extraction failed:", e);
      return { type: 'Others', location: 'Unknown', severity: 3 };
    }
  }

  public async generateFirstAid(type: string): Promise<string> {
    try {
        const response = await fetchAPI('/ai/assistant', {
          method: 'POST',
          body: JSON.stringify({ query: `Provide 3-5 immediate, life-saving steps in Tagalog for ${type} emergency.` })
        });
        return response.answer;
    } catch (e) {
        return "Please follow standard emergency procedures.";
    }
  }

  public getProactiveSuggestion(context: GuardianContext): string | null {
    if (context.pendingSOS > 5)
      return "Alert: High volume of incoming SOS reports. Consider activating emergency broadcast.";
    if (context.activeTanods === 0 && context.pendingSOS > 0)
      return "Notice: Pending incidents found but no Tanods are on patrol. Immediate dispatch recommended.";
    return null;
  }
}

// Ignore unused cb for backwards compat
export function setGuardianProgressCallback(_cb: ProgressCallback) {}

export const guardianAI = new GuardianAIServiceBackend();
