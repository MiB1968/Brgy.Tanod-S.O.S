// src/services/guardianAI.ts

export class GuardianAI {
  private worker: Worker | null = null;
  private isInitialized = false;
  private currentModel = "Qwen2-0.5B-Instruct-q4f16_1-MLC"; // Efficient and responsive default
  private progressHandlers = new Set<(progress: number, text?: string) => void>();
  private messageHandlers = new Map<string, (type: string, payload: any) => void>();

  static getInstance() {
    if (!GuardianAI.instance) GuardianAI.instance = new GuardianAI();
    return GuardianAI.instance;
  }
  private static instance: GuardianAI;

  init() {
    if (this.worker) return;

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
  }

  async loadModel(modelId?: string, onProgress?: (progress: number, text?: string) => void) {
    this.init();
    if (modelId) {
      this.currentModel = modelId;
    }

    return new Promise((resolve, reject) => {
      const uniqueId = `load-${Date.now()}`;
      
      const progressListener = (prog: number, text?: string) => {
        if (onProgress) onProgress(prog, text);
      };

      const handler = (type: string, payload: any) => {
        if (type === 'ready') {
          this.messageHandlers.delete(uniqueId);
          this.progressHandlers.delete(progressListener);
          resolve(true);
        }
        if (type === 'error') {
          this.messageHandlers.delete(uniqueId);
          this.progressHandlers.delete(progressListener);
          reject(payload);
        }
      };

      this.progressHandlers.add(progressListener);
      this.messageHandlers.set(uniqueId, handler);
      
      this.worker?.postMessage({ type: 'init', payload: { modelId: this.currentModel } });
    });
  }

  async generateResponse(prompt: string, onToken?: (token: string) => void): Promise<string> {
    this.init();
    
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
          reject(payload);
        }
      };

      this.messageHandlers.set(uniqueId, handler);
      this.worker?.postMessage({ type: 'generate', payload: { prompt } });
    });
  }

  clearCache() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.worker = null;
    this.isInitialized = false;
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
