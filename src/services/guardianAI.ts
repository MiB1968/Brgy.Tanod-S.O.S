// src/services/guardianAI.ts
import { fetchAPI } from './apiBase';
import { db } from '../db/offlineDB';
import { BARANGAY_PROTOCOLS } from '../data/barangayProtocols';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type GuardianState = 'IDLE' | 'LOADING' | 'READY' | 'PROCESSING' | 'FALLBACK' | 'ERROR';

export class GuardianAI {
  private worker: Worker | null = null;
  private isInitialized = false;
  private currentModel = "Qwen2-0.5B-Instruct-q4f16_1-MLC"; // Efficient and responsive default
  private progressHandlers = new Set<(progress: number, text?: string) => void>();
  private messageHandlers = new Map<string, (type: string, payload: any) => void>();
  private loadPromise: Promise<boolean> | null = null;
  private useBackendFallback = false;
  private currentSessionId = `session_${Date.now()}`;
  private currentState: GuardianState = 'IDLE';

  get isLoaded(): boolean {
    return this.isInitialized;
  }

  get state(): GuardianState {
    return this.currentState;
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
    return !!(navigator as any).gpu && 'gpu' in navigator;
  }

  init() {
    if (this.useBackendFallback) return;
    if (this.worker) return;

    if (!this.checkWebGPUSupport()) {
      console.warn("⚠️ WebGPU is not supported in this browser. Activating server-side Guardian AI backend proxy fallback.");
      this.useBackendFallback = true;
      this.isInitialized = true;
      this.setState('FALLBACK');
      return;
    }

    try {
      // Instantiate with standard worker configuration under Vite
      this.worker = new Worker(new URL('../workers/webllmWorker.ts', import.meta.url), { type: 'module' });

      this.worker.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'ready') {
          this.isInitialized = true;
          this.setState('READY');
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
        this.setState('FALLBACK');
      };
    } catch (err) {
      console.error("⚠️ Failed to initialize Web Worker for Guardian AI. Using backend fallback:", err);
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
        onProgress(0.2, "Bypassing WebGPU local engine...");
        onProgress(0.6, "Establishing link with server-side tactical AI...");
        onProgress(1.0, "Tactical AI Server Link Online");
      }
      this.setState('READY');
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
          this.setState('READY');
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
          this.setState('FALLBACK');
          resolve(true); // Resolve as true so app can proceed with backend fallback
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
    return `Gabay at Opisyal na Protokol ng Barangay:\n${matches.join("\n\n")}`;
  }

  async generateResponse(prompt: string, onToken?: (token: string) => void): Promise<string> {
    this.init();
    this.setState('PROCESSING');
    
    // Crisis Detection (Zero-Latency Regex)
    const lower = prompt.toLowerCase();
    let detectedCrisis: { type: string; level: string } | null = null;
    
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
    }

    if (!this.isInitialized) {
      console.log(`Guardian AI auto-initializing default model: ${this.currentModel}`);
      await this.loadModel(this.currentModel);
    }

    const context = this.retrieveContext(prompt);
    const enhancedPrompt = context 
      ? `User Command/Question: "${prompt}"\n\nOfficial Barangay Protocol to use for response:\n${context}\n\nTask: Sumagot sa natural na Tagalog/English batay sa opisyal na protokol na ito. Maging maikli, malinaw, at de-kalidad.`
      : prompt;

    await this.saveMessage('user', prompt);

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
        await this.saveMessage('assistant', finalAns);
        this.setState('READY');
        return finalAns;
      } catch (err) {
        console.error("🚨 Server-side fallback also failed:", err);
        const fallbackMsg = "Paumanhin, hindi maabot ang tactical server sa ngayon. Siguraduhing may internet connection.";
        if (onToken) onToken(fallbackMsg);
        this.setState('READY');
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
          this.saveMessage('assistant', payload.response);
          this.setState('READY');
          resolve(payload.response);
        }
        if (type === 'error') {
          this.messageHandlers.delete(uniqueId);
          console.warn("⚠️ Local model execution failed during generation. Falling back to backend:", payload);
          // Fallback on the fly
          this.useBackendFallback = true;
          this.setState('FALLBACK');
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
    this.setState('IDLE');
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

  private setState(newState: GuardianState) {
    this.currentState = newState;
  }
}

export const guardianAI = GuardianAI.getInstance();
export default guardianAI;
