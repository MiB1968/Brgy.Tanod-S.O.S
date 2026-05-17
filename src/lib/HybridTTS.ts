// src/lib/HybridTTS.ts
import { TagalogTTS } from "./TagalogTTS";
import { EmergencySoundManager } from "./EmergencySoundManager";

export type TTSEngine = "web-speech" | "web-audio-fallback";

export class HybridTTS {
  private static instance: HybridTTS;
  private webSpeech: TagalogTTS;
  private preferredEngine: TTSEngine = "web-speech";
  private isOfflineMode = false;

  static getInstance(): HybridTTS {
    if (!HybridTTS.instance) {
      HybridTTS.instance = new HybridTTS();
    }
    return HybridTTS.instance;
  }

  private constructor() {
    this.webSpeech = TagalogTTS.getInstance();
  }

  async initialize(): Promise<void> {
    await this.webSpeech.initialize();
    this.detectOfflineMode();
  }

  private detectOfflineMode() {
    this.isOfflineMode = !navigator.onLine;
    window.addEventListener("online", () => (this.isOfflineMode = false));
    window.addEventListener("offline", () => (this.isOfflineMode = true));
  }

  async speak(
    text: string,
    options: {
      lang?: string;
      rate?: number;
      pitch?: number;
      volume?: number;
      forceEngine?: TTSEngine;
    } = {},
  ): Promise<boolean> {
    await this.initialize();

    const engine = options.forceEngine || this.preferredEngine;

    try {
      // Primary: Web Speech API (Best quality for Tagalog)
      if (engine === "web-speech" && "speechSynthesis" in window) {
        const success = await this.tryWebSpeech(text, options);
        if (success) return true;
      }

      // Fallback: Web Audio Beeps + Visual Text (works completely offline)
      this.webAudioFallback(text);
      return true;
    } catch (error) {
      console.warn("TTS failed, using Web Audio fallback", error);
      this.webAudioFallback(text);
      return false;
    }
  }

  private async tryWebSpeech(text: string, options: any): Promise<boolean> {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.lang = options.lang || "tl-PH";
      utterance.rate = options.rate ?? 0.94;
      utterance.pitch = options.pitch ?? 1.05;
      utterance.volume = options.volume ?? 0.92;

      // Try to use Tagalog voice
      const voices = speechSynthesis.getVoices();
      const tlVoice = voices.find(
        (v) =>
          v.lang.includes("tl") || v.name.toLowerCase().includes("tagalog"),
      );
      if (tlVoice) utterance.voice = tlVoice;

      utterance.onend = () => resolve(true);
      utterance.onerror = (event) => {
        console.warn("Web Speech error:", event.error);
        resolve(false);
      };

      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    });
  }

  private webAudioFallback(text: string) {
    // Visual fallback
    this.showVisualAlert(text);

    // Play attention sound pattern
    const manager = EmergencySoundManager.getInstance();
    manager.playAttentionBeep();

    // Optional: Play short beep sequence based on text length
    setTimeout(() => manager.playBeep(900, 200, 0.7), 300);
    setTimeout(() => manager.playBeep(1200, 300, 0.6), 700);
  }

  private showVisualAlert(text: string) {
    const toast = document.createElement("div");
    toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl z-[100] text-center max-w-[90%] font-bold uppercase tracking-wider`;
    toast.innerHTML = `<strong>🔊 ${text}</strong>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = "opacity 0.5s";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  setPreferredEngine(engine: TTSEngine) {
    this.preferredEngine = engine;
  }

  stop() {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
    }
  }
}
