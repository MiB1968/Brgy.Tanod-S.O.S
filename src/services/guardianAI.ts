// src/services/guardianAI.ts
import { fetchAPI } from './apiBase';
import { db } from '../db/offlineDB';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class GuardianAI {
  private worker: Worker | null = null;
  private isInitialized = false;
  private currentModel = "Qwen2-0.5B-Instruct-q4f16_1-MLC"; // Efficient and responsive default
  private progressHandlers = new Set<(progress: number, text?: string) => void>();
  private messageHandlers = new Map<string, (type: string, payload: any) => void>();
  private loadPromise: Promise<boolean> | null = null;
  private useBackendFallback = false;
  private currentSessionId = `session_${Date.now()}`;

  get isLoaded(): boolean {
    return this.isInitialized;
  }

  static getInstance() {
    if (!GuardianAI.instance) GuardianAI.instance = new GuardianAI();
    return GuardianAI.instance;
  }
  private static instance: GuardianAI;

  async saveMessage(role: 'user' | 'assistant', content: string) {
    try {
      await db.aiChatHistory.add({
        sessionId: this.currentSessionId,
        role,
        content,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[GuardianAI] Failed to save message to Dexie history:', err);
    }
  }

  async loadHistory(): Promise<any[]> {
    try {
      return await db.aiChatHistory
        .where('sessionId')
        .equals(this.currentSessionId)
        .sortBy('timestamp');
    } catch (err) {
      console.error('[GuardianAI] Failed to load message history from Dexie:', err);
      return [];
    }
  }

  async clearCurrentSession() {
    try {
      const sessionId = this.currentSessionId;
      await db.aiChatHistory.where('sessionId').equals(sessionId).delete();
      this.currentSessionId = `session_${Date.now()}`;
    } catch (err) {
      console.error('[GuardianAI] Failed to clear current AI session:', err);
    }
  }

  private checkWebGPUSupport(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(navigator as any).gpu;
  }

  init() {
    if (this.useBackendFallback) return;
    if (this.worker) return;

    if (!this.checkWebGPUSupport()) {
      console.warn("⚠️ WebGPU is not supported in this browser. Activating server-side Guardian AI backend proxy fallback.");
      this.useBackendFallback = true;
      this.isInitialized = true;
      return;
    }

    try {
      // Instantiate with standard worker configuration under Vite
      this.worker = new Worker(new URL('../workers/webllmWorker.ts', import.meta.url), { type: 'module' });

      this.worker.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'ready') {
          this.isInitialized = true;
        }
        
        // Notify components listening to raw events
        window.dispatchEvent(new CustomEvent('guardian-ai-event', { detail: { type, payload } }));

        // Process direct callbacks
        if (type === 'progress') {
          this.progressHandlers.forEach(handler => handler(payload.progress, payload.text));
        }

        this.messageHandlers.forEach(handler => handler(type, payload));
      };

      this.worker.onerror = (e) => {
        console.error("⚠️ Guardian AI Worker error:", e);
        this.useBackendFallback = true;
        this.isInitialized = true;
      };
    } catch (err) {
      console.error("⚠️ Failed to initialize Web Worker for Guardian AI. Using backend fallback:", err);
      this.useBackendFallback = true;
      this.isInitialized = true;
    }
  }

  async loadModel(modelId?: string, onProgress?: (progress: number, text?: string) => void): Promise<boolean> {
    this.init();

    if (this.useBackendFallback) {
      if (onProgress) {
        onProgress(0.2, "Bypassing WebGPU local engine...");
        onProgress(0.6, "Establishing link with server-side tactical AI...");
        onProgress(1.0, "Tactical AI Server Link Online");
      }
      return true;
    }
    
    const targetModel = modelId || this.currentModel;
    
    // If different model is requested and already initialized, reset cleanly
    if (this.isInitialized && targetModel !== this.currentModel) {
      this.clearCache();
      this.init();
      if (this.useBackendFallback) return true;
    }

    if (this.isInitialized && targetModel === this.currentModel) {
      return true;
    }

    this.currentModel = targetModel;

    if (this.loadPromise) {
      if (onProgress) {
        const progressListener = (prog: number, text?: string) => {
          onProgress(prog, text);
        };
        this.progressHandlers.add(progressListener);
        this.loadPromise.finally(() => {
          this.progressHandlers.delete(progressListener);
        });
      }
      return this.loadPromise;
    }

    this.loadPromise = new Promise<boolean>((resolve, reject) => {
      const uniqueId = `load-${Date.now()}`;
      
      const progressListener = (prog: number, text?: string) => {
        if (onProgress) onProgress(prog, text);
      };

      const handler = (type: string, payload: any) => {
        if (type === 'ready') {
          this.messageHandlers.delete(uniqueId);
          this.progressHandlers.delete(progressListener);
          this.isInitialized = true;
          resolve(true);
        }
        if (type === 'error') {
          this.messageHandlers.delete(uniqueId);
          this.progressHandlers.delete(progressListener);
          this.loadPromise = null;
          this.isInitialized = false;
          console.warn("⚠️ Local model load encountered an error. Seamlessly switching to server-side AI proxy fallback:", payload);
          this.useBackendFallback = true;
          this.isInitialized = true;
          resolve(true); // Resolve as true so app can proceed with backend fallback
        }
      };

      this.progressHandlers.add(progressListener);
      this.messageHandlers.set(uniqueId, handler);
      
      this.worker?.postMessage({ type: 'init', payload: { modelId: this.currentModel } });
    });

    return this.loadPromise;
  }

  private knowledgeBase = [
    {
      keywords: ["sunog", "apoy", "fire", "extinguisher", "silbato", "hazard", "brand"],
      title: "Fire Response Protocol",
      content: "1. SOUND THE ALARM: Sumigaw ng 'Sunog!' at gamitin ang sipol o silbato para alamin ng lahat.\n2. COORDINATE EVACUATION: Lumikas agad papunta sa itinakdang evacuation assembly point.\n3. CALL BFP / HOTLINE: Tawagan ang Bureau of Fire Protection (BFP) o desk ng Barangay Tanod.\n4. USE EXTINGUISHER: Kung ligtas, gamitin ang fire extinguisher gamit ang P.A.S.S. method (Pull, Aim, Squeeze, Sweep). Huwag gumamit ng tubig sa electrical fire."
    },
    {
      keywords: ["medical", "hininga", "first aid", "sugat", "fracture", "bali", "atake", "heart", "stroke", "hilo", "nakagat", "sakit", "patak"],
      title: "Barangay Medical First Aid",
      content: "1. CHECK AIRWAY & BREATHING: Siguraduhing may hangin ang biktima. Paluwagin ang masisikip na damit.\n2. POSITION COMFORTABLY: Upasala o ihiga sa ligtas at komportableng posisyon.\n3. CONTROL BLEEDING: Lagyan ng presyon (direct pressure) gamit ang malinis na tela kung may dumudugong sugat.\n4. STAY CALM & MONITOR: Huwag bigyan ng pagkain o inumin ang walang malay. Maghintay ng emergency responders habang binabantayan ang kalagayan nito."
    },
    {
      keywords: ["baha", "bagyo", "flood", "ulan", "evacuate", "kuryente", "typhoon"],
      title: "Flood & Typhoon Safety Protocol",
      content: "1. DISCONNECT POWER: Patayin ang pangunahing switch ng kuryente at tanggalin sa saksakan ang mga appliance.\n2. MONITOR WATER LEVELS: Makinig sa anunsyo ng barangay gamit ang Guardian Megaphone o radyo.\n3. EVACUATE EARLY: Kung nasa mababang lugar, lumikas nang maaga papunta sa Barangay Evacuation Court.\n4. AVOID WATER: Huwag lumusong, maglaro, o magmaneho sa baha upang maiwasan ang leptospirosis at pagkakuryente."
    },
    {
      keywords: ["crime", "krimen", "magnanakaw", "holdap", "away", "gulo", "suspicious", "stranger", "atake", "threat"],
      title: "Crime and Security Protocol",
      content: "1. PRIORITY SAFETY: Katiting na kaligtasan ang unahin. Huwag makipag-away o lumaban sa armadong salarin. Ibigay ang hiling at tumakbo sa ligtas na dako.\n2. CALL BACKUP: Tawagan o senyasan agad ang pinakamalapit na Tanod Patrol o PNP hotlines.\n3. OBSERVE & RECORD: Tandaan ang itsura, kasuotan, at direksyon ng pagtakas ng salarin.\n4. SECURE EVIDENCE: Huwag hawakan ang pinangyarihan ng krimen upang mapangalagaan ang fingerprints o ebidensya."
    },
    {
      keywords: ["lindol", "earthquake", "quake", "shake", "cracks", "pader"],
      title: "Earthquake Emergency Protocol",
      content: "1. DROP, COVER, HOLD: Sumilong sa ilalim ng matitibay na mesa at humawak nang mahigpit habang may pagyanig.\n2. STAY CLEAR: Umiwas sa mga glass windows, pader, at matatayog na poste o kable.\n3. EVACUATE CALMLY: Pagkatapos ng pagyanig, lumikas nang mahinahon gamit ang nakatalagang fire exit patungo sa ligtas na open space.\n4. BE PREPARED: Maghanda para sa mga aftershocks sa pamamagitan ng pag-antabay sa pampublikong ulat."
    },
    {
      keywords: ["kable", "wire", "spark", "electric", "poste", "downed line"],
      title: "Electrical Hazard Safety",
      content: "1. KEEP DISTANCE: Lumayo ng hindi bababa sa 10 metro mula sa bumagsak na kable o poste ng kuryente.\n2. ISOLATE AREA: Harangan ang daan at lagyan ng pansamantalga na babala upang walang makalapit.\n3. CALL POWER CO / BARANGAY: Ipagbigay-alam agad sa Meralco at Barangay Emergency Team upang ma-isolate at mapatay ang linya ng kuryente."
    }
  ];

  private retrieveContext(query: string): string {
    const lowerQuery = query.toLowerCase();
    const matches: string[] = [];

    for (const item of this.knowledgeBase) {
      const isMatch = item.keywords.some(keyword => lowerQuery.includes(keyword)) ||
                      item.title.toLowerCase().includes(lowerQuery);
      if (isMatch) {
         matches.push(`[${item.title.toUpperCase()}]\n${item.content}`);
      }
    }

    if (matches.length === 0) return "";
    return `Gabay at Opisyal na Protokol ng Barangay:\n${matches.join("\n\n")}`;
  }

  async generateResponse(prompt: string, onToken?: (token: string) => void): Promise<string> {
    this.init();
    
    if (!this.isInitialized) {
      console.log(`Guardian AI auto-initializing default model: ${this.currentModel}`);
      await this.loadModel(this.currentModel);
    }

    const context = this.retrieveContext(prompt);
    const enhancedPrompt = context 
      ? `User Command/Question: "${prompt}"\n\nOfficial Barangay Protocol to use for response:\n${context}\n\nTask: Sumagot sa natural na Tagalog/English batay sa opisyal na protokol na ito. Maging maikli, malinaw, at de-kalidad.`
      : prompt;

    if (this.useBackendFallback) {
      try {
        console.log("⚡ Routing prompt via server-side Express Gemini service...");
        const response = await fetchAPI('/ai/guardian', {
          method: 'POST',
          body: JSON.stringify({ text: enhancedPrompt })
        });
        const finalAns = response.response || "Komunidad na ligtas ang ating hangad. Handang tumulong po sa inyo.";
        if (onToken) {
          // Stream/split response slightly to simulate live generation look and feel
          const words = finalAns.split(' ');
          let accumulated = "";
          for (let i = 0; i < words.length; i++) {
            const part = words[i] + (i < words.length - 1 ? ' ' : '');
            accumulated += part;
            onToken(part);
            // Non-blocking sleep for smooth local simulation experience
            await new Promise(r => setTimeout(r, Math.random() * 20 + 5));
          }
        }
        return finalAns;
      } catch (err) {
        console.error("🚨 Server-side fallback also failed:", err);
        const fallbackMsg = "Paumanhin, hindi maabot ang tactical server sa ngayon. Siguraduhing may internet connection.";
        if (onToken) onToken(fallbackMsg);
        return fallbackMsg;
      }
    }
    
    return new Promise((resolve, reject) => {
      const uniqueId = `generate-${Date.now()}`;
      let fullResponse = "";

      const handler = (type: string, payload: any) => {
        if (type === 'token') {
          fullResponse = payload.fullResponse;
          if (onToken) onToken(payload.token);
        }
        if (type === 'complete') {
          this.messageHandlers.delete(uniqueId);
          resolve(payload.response);
        }
        if (type === 'error') {
          this.messageHandlers.delete(uniqueId);
          console.warn("⚠️ Local model execution failed during generation. Falling back to backend:", payload);
          // Fallback on the fly
          this.useBackendFallback = true;
          this.isInitialized = true;
          this.generateResponse(prompt, onToken).then(resolve).catch(reject);
        }
      };

      this.messageHandlers.set(uniqueId, handler);
      this.worker?.postMessage({ type: 'generate', payload: { prompt: enhancedPrompt } });
    });
  }

  clearCache() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.worker = null;
    this.isInitialized = false;
    this.loadPromise = null;
    console.log("🧹 Guardian AI Worker terminated and cache handler closed");
  }

  speak(text: string) {
    if ('speechSynthesis' in window) {
      // Cancel active voice playbacks to prevent queue jamming
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tl-PH'; // Native Filipino synthesis support
      speechSynthesis.speak(utterance);
    }
  }
}

export const guardianAI = GuardianAI.getInstance();
export default guardianAI;
