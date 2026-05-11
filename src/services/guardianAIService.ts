// src/services/guardianAIService.ts
// CLIENT-SIDE — tactical command processing, no privilege escalation.

import { voiceService } from './voiceService';
import { soundService } from './soundService';

export interface GuardianContext {
  pendingSOS: number;
  activeTanods: number;
  isSuperAdmin: boolean;
}

export interface GuardianResponse {
  reply: string;
  action?: 'SUMMARIZE' | 'SUGGEST_DISPATCH' | 'STATUS_REPORT' | 'HELP';
}

/**
 * GuardianAIService
 *
 * Tactical voice command interpreter for the admin dashboard.
 * Handles local command shortcuts (status, summarize, help).
 * Complex AI reasoning is delegated to the server via socket.
 *
 * SECURITY: No secret phrases. No privilege escalation via voice.
 * Super admin access is granted only through the login system.
 */
class GuardianAIService {
  /**
   * Processes tactical voice commands locally.
   * Returns a structured response for the UI to act on.
   */
  public async processCommand(
    text: string,
    context: GuardianContext
  ): Promise<GuardianResponse> {
    const command = text.toUpperCase().replace(/[.,!?]/g, '').trim();

    // ── Status Summary ─────────────────────────────────────────────────
    if (command.includes('SUMMARIZE') || command.includes('STATUS') || command.includes('ULAT')) {
      let reply = 'System status: ';

      if (context.pendingSOS > 0) {
        reply += `${context.pendingSOS} pending SOS ${context.pendingSOS === 1 ? 'report' : 'reports'} require attention. `;
      } else {
        reply += 'All zones clear. ';
      }

      reply += `${context.activeTanods} Tanod ${context.activeTanods === 1 ? 'officer' : 'officers'} currently on patrol.`;

      return { reply, action: 'STATUS_REPORT' };
    }

    // ── Dispatch Suggestion ────────────────────────────────────────────
    if (
      command.includes('DISPATCH') ||
      command.includes('IPADALA') ||
      command.includes('SEND')
    ) {
      if (context.activeTanods === 0) {
        return {
          reply: 'Warning: No Tanods are currently on patrol. Please activate personnel before dispatching.',
          action: 'SUGGEST_DISPATCH',
        };
      }
      return {
        reply: `Ready to dispatch. ${context.activeTanods} Tanod ${context.activeTanods === 1 ? 'officer is' : 'officers are'} available. Please confirm the target location in the dashboard.`,
        action: 'SUGGEST_DISPATCH',
      };
    }

    // ── Suggestion ────────────────────────────────────────────────────
    if (command.includes('SUGGEST') || command.includes('WHAT SHOULD') || command.includes('ANO') ) {
      if (context.pendingSOS > 0) {
        return {
          reply: `I suggest reviewing the ${context.pendingSOS} pending ${context.pendingSOS === 1 ? 'alert' : 'alerts'} in the dashboard. Would you like to dispatch the nearest available Tanod?`,
          action: 'SUGGEST_DISPATCH',
        };
      }
      return {
        reply: 'The community is currently quiet. Good time to review patrol logs or check tonight\'s schedule.',
        action: 'SUMMARIZE',
      };
    }

    // ── Help ──────────────────────────────────────────────────────────
    if (command.includes('HELP') || command.includes('TULONG') || command.includes('WHAT CAN')) {
      return {
        reply: 'I can give you a situation summary, suggest dispatch actions, or report system status. Just say "status", "summarize", "dispatch", or "suggest".',
        action: 'HELP',
      };
    }

    // ── Default ───────────────────────────────────────────────────────
    return {
      reply: 'Acknowledged. Standing by for tactical instructions. Say "help" for available commands.',
    };
  }

  /**
   * Proactive alerts based on system state.
   * Called periodically by the dashboard.
   */
  public getProactiveSuggestion(context: GuardianContext): string | null {
    if (context.pendingSOS > 5) {
      return 'Alert: High volume of incoming SOS reports. Consider activating emergency broadcast.';
    }
    if (context.activeTanods === 0 && context.pendingSOS > 0) {
      return 'Notice: Pending incidents found but no Tanods are on patrol. Immediate dispatch recommended.';
    }
    return null;
  }
}

export const guardianAI = new GuardianAIService();
