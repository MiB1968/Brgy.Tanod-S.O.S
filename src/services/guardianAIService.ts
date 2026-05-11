
import { voiceService } from './voiceService';
import { soundService } from './soundService';
import { toast } from 'react-hot-toast';

/**
 * Tactical Guardian intelligence Layer
 */
class GuardianAIService {
  private secretPhrase = "I AM RUBEN LLEGO SYSTEM CREATOR";

  /**
   * Processes tactical voice commands
   */
  public async processCommand(text: string, context: { 
    pendingSOS: number, 
    activeTanods: number,
    isSuperAdmin: boolean 
  }): Promise<{ reply: string; action?: string }> {
    const command = text.toUpperCase();
    console.log('[Guardian AI] Tactical Command Input:', command);

    // 1. SECRET PHASE RECOGNITION (RUBEN LLEGO PROTOCOL)
    if (command.includes(this.secretPhrase) || command.includes("I AM RUBEN LLEGO")) {
      soundService.play('intro_super');
      return { 
        reply: "Welcome back, System Owner and Creator, Ruben Llego. Full system access granted. Guardian AI is at your command.",
        action: 'UNLOCK_SUPER_ADMIN'
      };
    }

    // 2. Dashboard Intelligence
    if (command.includes("SUMMARIZE") || command.includes("STATUS")) {
      let reply = `System status: normal. `;
      if (context.pendingSOS > 0) {
        reply += `There are ${context.pendingSOS} pending SOS reports requiring your attention. `;
      } else {
        reply += `All zones are clear. `;
      }
      reply += `${context.activeTanods} Tanod personnel are currently on active patrol.`;
      return { reply };
    }

    if (command.includes("HELP") || command.includes("WHAT CAN YOU DO")) {
      return { 
        reply: "I can summarize incident reports, provide system status, and help you dispatch personnel. Just ask me to summarize or check status." 
      };
    }

    // 3. Proactive Suggestions (Triggered if silence or specific keyword)
    if (command.includes("SUGGEST") || command.includes("WHAT SHOULD I DO")) {
      if (context.pendingSOS > 0) {
        return { reply: `I suggest reviewing the ${context.pendingSOS} pending alerts in the dashboard. Shall I prioritize them for you?` };
      }
      return { reply: "The community is currently quiet. Good time to review patrol logs or update broadcast settings." };
    }

    return { reply: "Acknowledged. Standing by for further tactical instructions." };
  }

  /**
   * Proactive suggestion logic based on system state
   */
  public getProactiveSuggestion(context: { pendingSOS: number, activeTanods: number }): string | null {
    if (context.pendingSOS > 5) {
      return "Alert: High volume of incoming SOS reports. Suggest activating emergency broadcast.";
    }
    if (context.activeTanods === 0 && context.pendingSOS > 0) {
      return "System Notice: Pending incidents found but no Tanods are on patrol. Suggest immediate dispatch.";
    }
    return null;
  }
}

export const guardianAI = new GuardianAIService();
