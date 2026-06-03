// src/services/guardianAI.ts
import { fetchAPI } from './apiBase';
import { db } from '../db/offlineDB';
import { BARANGAY_PROTOCOLS } from '../data/barangayProtocols';
import { GuardianContext, GuardianResponse, GuardianState, CrisisType } from '../types/ai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class GuardianAI {
  private worker: Worker | null = null;
  private isInitialized = false;
  private currentModel = "Qwen2-0.5B-Instruct-q4f16_1-MLC"; // Optimal response on low-end phones
  private progressHandlers = new Set<(progress: number, text?: string) => void>();
  private messageHandlers = new Map<string, (type: string, payload: any) => void>();
  private loadPromise: Promise<boolean> | null = null;
  private useBackendFallback = false;
  private currentSessionId = `session_${Date.now()}`;
  private currentState: GuardianState = 'IDLE';
  private deviceProfile: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

  private constructor() {
    this.deviceProfile = this.calibrateDevice();
  }

  private calibrateDevice(): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (typeof navigator === 'undefined') return 'MEDIUM';
    const memory = (navigator as any).deviceMemory || 4; // GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    if (memory <= 3 || hardwareConcurrency <= 4) {
      console.log('🛡️ Low-spec device profile applied for Offline LLM.');
      return 'LOW';
    }
    if (memory >= 6 && hardwareConcurrency >= 8) return 'HIGH';
    return 'MEDIUM';
  }

  public getChunkSize(): number {
    return this.deviceProfile === 'LOW' ? 8 : 1;
  }

  get isLoaded(): boolean {
    return this.isInitialized;
  }

  get state(): GuardianState {
    return this.currentState;
  }

  static getInstance() {
    if (!GuardianAI.instance) {
      GuardianAI.instance = new GuardianAI();
    }
    return GuardianAI.instance;
  }
  private static instance: GuardianAI;

  // Preloading hook for compatibility with templates
  public preload(onProgress?: (progress: number, text: string) => void) {
    this.loadModel(this.currentModel, (prog, text) => {
      if (onProgress) onProgress(prog, text || "Initializing engine...");
    }).catch(err => {
      console.warn("[GuardianAI] Preload error:", err);
    });
  }

  public isReady(): boolean {
    return this.isInitialized || this.useBackendFallback;
  }

  async saveMessage(role: 'user' | 'assistant', content: string) {
    try {
      await db.aiChatHistory.add({
        sessionId: this.currentSessionId,
        role,
        content,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[GuardianAI] Failed to persist message:', err);
    }
  }

  async loadHistory(): Promise<any[]> {
    try {
      return await db.aiChatHistory
        .where('sessionId')
        .equals(this.currentSessionId)
        .sortBy('timestamp');
    } catch (err) {
      console.error('[GuardianAI] Failed to load chat history:', err);
      return [];
    }
  }

  async clearCurrentSession() {
    try {
      const sessionId = this.currentSessionId;
      await db.aiChatHistory.where('sessionId').equals(sessionId).delete();
      this.currentSessionId = `session_${Date.now()}`;
    } catch (err) {
      console.error('[GuardianAI] Failed to clear current session:', err);
    }
  }

  private checkWebGPUSupport(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(navigator as any).gpu && 'gpu' in navigator;
  }

  init() {
    if (this.useBackendFallback) return;
    if (this.worker) return;

    if (!this.checkWebGPUSupport()) {
      console.warn("⚠️ WebGPU is not supported. Gracefully falling back to Express-hosted Gemini API client-side.");
      this.useBackendFallback = true;
      this.isInitialized = true;
      this.setState('FALLBACK');
      return;
    }

    try {
      this.worker = new Worker(new URL('../workers/webllmWorker.ts', import.meta.url), { type: 'module' });

      this.worker.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'ready') {
          this.isInitialized = true;
          this.setState('READY');
        }
        
        window.dispatchEvent(new CustomEvent('guardian-ai-event', { detail: { type, payload } }));

        if (type === 'progress') {
          this.progressHandlers.forEach(handler => handler(payload.progress, payload.text));
        }

        this.messageHandlers.forEach(handler => handler(type, payload));
      };

      this.worker.onerror = (e) => {
        console.error("⚠️ Local worker crashed. Deploying fallback to Gemini API proxy server:", e);
        this.useBackendFallback = true;
        this.isInitialized = true;
        this.setState('FALLBACK');
      };
    } catch (err) {
      console.error("⚠️ Fail initiating offline worker. Using Gemini backend fallback:", err);
      this.useBackendFallback = true;
      this.isInitialized = true;
      this.setState('FALLBACK');
    }
  }

  async loadModel(modelId?: string, onProgress?: (progress: number, text?: string) => void): Promise<boolean> {
    this.setState('LOADING');
    this.init();

    if (this.useBackendFallback) {
      if (onProgress) {
        onProgress(0.5, "Active server connection confirmed...");
        onProgress(1.0, "Tactical remote link ready");
      }
      this.setState('READY');
      return true;
    }
    
    const targetModel = modelId || this.currentModel;
    
    if (this.isInitialized && targetModel !== this.currentModel) {
      this.clearCache();
      this.init();
      if (this.useBackendFallback) return true;
    }

    if (this.isInitialized && targetModel === this.currentModel) {
      this.setState('READY');
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

    this.loadPromise = new Promise<boolean>((resolve) => {
      const uniqueId = `load-${Date.now()}`;
      
      const progressListener = (prog: number, text?: string) => {
        if (onProgress) onProgress(prog, text);
      };

      const handler = (type: string, payload: any) => {
        if (type === 'ready') {
          this.messageHandlers.delete(uniqueId);
          this.progressHandlers.delete(progressListener);
          this.isInitialized = true;
          this.setState('READY');
          resolve(true);
        }
        if (type === 'error') {
          this.messageHandlers.delete(uniqueId);
          this.progressHandlers.delete(progressListener);
          this.loadPromise = null;
          this.isInitialized = false;
          console.warn("⚠️ Local model init error. Shifting dynamically to server-side Gemini backend.", payload);
          this.useBackendFallback = true;
          this.isInitialized = true;
          this.setState('FALLBACK');
          resolve(true); 
        }
      };

      this.progressHandlers.add(progressListener);
      this.messageHandlers.set(uniqueId, handler);
      
      this.worker?.postMessage({ type: 'init', payload: { modelId: this.currentModel } });
    });

    return this.loadPromise;
  }

  private retrieveContext(query: string): string {
    const lowerQuery = query.toLowerCase();
    const matches: string[] = [];

    for (const item of BARANGAY_PROTOCOLS) {
      const isMatch = item.keywords.some(keyword => lowerQuery.includes(keyword)) ||
                      item.title.toLowerCase().includes(lowerQuery);
      if (isMatch) {
         matches.push(`[${item.title.toUpperCase()}]\n${item.content}`);
      }
    }

    if (matches.length === 0) return "";
    return `Official Barangay Protocols:\n${matches.join("\n\n")}`;
  }

  // Crisis Detection logic
  public detectCrisis(prompt: string): boolean {
    const lower = prompt.toLowerCase();
    let detectedCrisis: { type: CrisisType; level: string } | null = null;
    
    if (/sunog|fire|apoy|usok|smoke/i.test(lower)) {
      detectedCrisis = { type: 'FIRE', level: 'CRITICAL' };
    } else if (/sos|saklolo|tulong|help|emergency|danger|panganib/i.test(lower)) {
      detectedCrisis = { type: 'SOS', level: 'HIGH' };
    } else if (/krimen|magnanakaw|robber|holdap|baril|gun|weapon|patayan|violence/i.test(lower)) {
      detectedCrisis = { type: 'SECURITY', level: 'CRITICAL' };
    } else if (/hininga|medical|nahilo|heart attack|stroke|dugo|bleeding|injury/i.test(lower)) {
      detectedCrisis = { type: 'MEDICAL', level: 'HIGH' };
    }

    if (detectedCrisis) {
      window.dispatchEvent(new CustomEvent('guardian-crisis-detected', { 
        detail: { ...detectedCrisis, transcript: prompt } 
      }));
      return true;
    }
    return false;
  }

  // Base prompt-to-response generation (with streaming token callback)
  async generateResponse(prompt: string, onToken?: (token: string) => void): Promise<string> {
    this.init();
    this.setState('PROCESSING');
    
    this.detectCrisis(prompt);

    if (!this.isInitialized) {
      await this.loadModel(this.currentModel);
    }

    const context = this.retrieveContext(prompt);
    const enhancedPrompt = context 
      ? `User query: "${prompt}"\n\nOfficial Barangay Protocol to reference:\n${context}\n\nRespond briefly in natural Tagalog/Filipino or English matching the intent of this protocol.`
      : prompt;

    await this.saveMessage('user', prompt);

    if (this.useBackendFallback) {
      try {
        const responseData = await fetchAPI('/ai/guardian', {
          method: 'POST',
          body: JSON.stringify({ text: enhancedPrompt })
        });
        const finalAns = responseData.response || "Mabuhay! Narito po ang inyong Guardian Emergency Assistant upang tumulong.";
        if (onToken) {
          const parts = finalAns.split(' ');
          for (let i = 0; i < parts.length; i++) {
            const piece = parts[i] + (i < parts.length - 1 ? ' ' : '');
            onToken(piece);
            await new Promise(r => setTimeout(r, Math.random() * 15 + 5));
          }
        }
        await this.saveMessage('assistant', finalAns);
        this.setState('READY');
        return finalAns;
      } catch (err) {
        console.error("🚨 Remote fallback also unreachable:", err);
        const failMsg = "Paumanhin, kasalukuyang offline ang link sa tactical server. Siguraduhing ligtas ang inyong kapaligiran at sundin ang pangkaraniwang emergency procedure.";
        if (onToken) onToken(failMsg);
        this.setState('READY');
        return failMsg;
      }
    }
    
    return new Promise((resolve, reject) => {
      const uniqueId = `generate-${Date.now()}`;

      const handler = (type: string, payload: any) => {
        if (type === 'token') {
          if (onToken) onToken(payload.token);
        }
        if (type === 'complete') {
          this.messageHandlers.delete(uniqueId);
          this.saveMessage('assistant', payload.response);
          this.setState('READY');
          resolve(payload.response);
        }
        if (type === 'error') {
          this.messageHandlers.delete(uniqueId);
          console.warn("⚠️ Local execution failure. Dynamic transition to backend:", payload);
          this.useBackendFallback = true;
          this.setState('FALLBACK');
          this.generateResponse(prompt, onToken).then(resolve).catch(reject);
        }
      };

      this.messageHandlers.set(uniqueId, handler);
      this.worker?.postMessage({ 
        type: 'generate', 
        payload: { 
          prompt: enhancedPrompt,
          chunkSize: this.getChunkSize()
        } 
      });
    });
  }

  // Tactical administrative commands handler matching guardianAIService
  public async processCommand(
    text: string,
    context: GuardianContext
  ): Promise<GuardianResponse> {
    try {
      const responseData = await fetchAPI('/ai/guardian', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      
      const content = responseData.response || "";
      const upper = text.toUpperCase();
      let action: GuardianResponse["action"];
      if (upper.includes("STATUS") || upper.includes("ULAT") || upper.includes("SUMMARIZE")) {
        action = "STATUS_REPORT";
      } else if (upper.includes("DISPATCH") || upper.includes("IPADALA") || upper.includes("SEND")) {
        action = "SUGGEST_DISPATCH";
      } else if (upper.includes("HELP") || upper.includes("TULONG")) {
        action = "HELP";
      }

      return { reply: content, action, isCrisis: this.detectCrisis(text) };
    } catch {
      return this.fallbackCommand(text, context);
    }
  }

  private fallbackCommand(text: string, context: GuardianContext): GuardianResponse {
    const command = text.toUpperCase().replace(/[.,!?]/g, "").trim();

    if (command.includes("STATUS") || command.includes("SUMMARIZE") || command.includes("ULAT")) {
      let reply = "System status: ";
      reply += context.pendingSOS > 0
          ? `${context.pendingSOS} pending S.O.S reports pending review. `
          : "All sectors clear. ";
      reply += `${context.activeTanods} active Tanod patrols tracking.`;
      return { reply, action: "STATUS_REPORT" };
    }

    if (command.includes("DISPATCH") || command.includes("IPADALA") || command.includes("SEND")) {
      if (context.activeTanods === 0) {
        return { reply: "Caution: No active Barangay Tanods are currently on patrol.", action: "SUGGEST_DISPATCH" };
      }
      return {
        reply: `${context.activeTanods} Tanod personnel designated available. Authorize dispatch on your Tactical Dock.`,
        action: "SUGGEST_DISPATCH",
      };
    }

    if (command.includes("HELP") || command.includes("TULONG")) {
      return { reply: 'Command guidelines: "Status" for status report, "Dispatch" to allocate patrol officers.', action: "HELP" };
    }

    return { reply: "Instruction received. Ready and standing by for further tactical input." };
  }

  // Incident Classification Proxy
  public async classifyIncident(description: string): Promise<string> {
    if (!description.trim()) return "Others";
    try {
        const responseData = await fetchAPI('/ai/analyze', {
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
        return map[responseData.analysis?.incidentType] || "Others";
    } catch {
        return "Others";
    }
  }

  // Shift summary generator
  public async summarizeShift(incidents: any[]): Promise<string> {
    if (incidents.length === 0) return "No incidents logged this shift. Peace and safety levels stable.";

    const listStr = incidents.map(i => `- ${i.type} at ${i.location}: ${i.description}`).join('\n');
    try {
        const responseData = await fetchAPI('/api/ai/summarize', {
          method: 'POST',
          body: JSON.stringify({ incidentNotes: listStr })
        });
        return responseData.summary || "Summary successfully compiled but contains empty sections.";
    } catch {
        return "Error synthesizing shift logs. Direct record analysis suggested.";
    }
  }

  // SOS Detail parsing proxy
  public async extractSOSDetails(text: string): Promise<{ type: string, location: string, severity: number }> {
    try {
      const responseData = await fetchAPI('/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({ description: text })
      });
      return {
          type: responseData.analysis?.incidentType || 'OTHER',
          location: 'Auto-detected Zone',
          severity: Math.ceil((responseData.analysis?.severityScore || 5) / 2) // Normalizes 1-10 scale down to 1-5
      };
    } catch {
      return { type: 'Others', location: 'Unknown Coordinate', severity: 3 };
    }
  }

  // First aid guides
  public async generateFirstAid(type: string): Promise<string> {
    try {
        const responseData = await fetchAPI('/ai/assistant', {
          method: 'POST',
          body: JSON.stringify({ query: `Magbigay ng 3 hanggang 5 mahahalagang paunang lunas o first aid steps sa Tagalog para sa emergency na ${type}.` })
        });
        return responseData.answer;
    } catch {
        return "Gawin ang karaniwang paunang lunas at hintayin ang mga emergency responder.";
    }
  }

  // Proactive dashboard alert suggestions
  public getProactiveSuggestion(context: GuardianContext): string | null {
    if (context.pendingSOS > 5) {
      return "Alert: Emergency alert count elevated. Recommended activation of auxiliary Tanod response channels.";
    }
    if (context.activeTanods === 0 && context.pendingSOS > 0) {
      return "Alert: Unhandled SOS reports are logged with zero dispatch Tanods active on patrol.";
    }
    return null;
  }

  clearCache() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.worker = null;
    this.isInitialized = false;
    this.loadPromise = null;
    this.setState('IDLE');
    console.log("🧹 Guardian AI Worker terminated cleanly");
  }

  // Offline-first Web TTS speech synthesis with Filipino local voice support
  speak(text: string) {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tl-PH';
      speechSynthesis.speak(utterance);
    }
  }

  private setState(newState: GuardianState) {
    this.currentState = newState;
    window.dispatchEvent(new CustomEvent('guardian-state-changed', { detail: { state: newState } }));
  }
}

export const guardianAI = GuardianAI.getInstance();
export default guardianAI;
