// src/lib/TagalogTTS.ts
export class TagalogTTS {
  private static instance: TagalogTTS;
  private voices: SpeechSynthesisVoice[] = [];
  private isReady = false;

  static getInstance() {
    if (!TagalogTTS.instance) TagalogTTS.instance = new TagalogTTS();
    return TagalogTTS.instance;
  }

  async initialize(): Promise<void> {
    if (this.isReady) return;
    return new Promise((resolve) => {
      const load = () => {
        this.voices = speechSynthesis.getVoices();
        this.isReady = true;
        resolve();
      };
      if (speechSynthesis.getVoices().length) load();
      else speechSynthesis.onvoiceschanged = load;
    });
  }

  speak(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      volume?: number;
      voiceName?: string;
      lang?: string;
    } = {},
  ) {
    if (!("speechSynthesis" in window)) {
      console.warn("SpeechSynthesis not supported");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || "tl-PH";
    utterance.rate = options.rate ?? 0.94;
    utterance.pitch = options.pitch ?? 1.05;
    utterance.volume = options.volume ?? 0.92;

    const preferredVoice =
      this.voices.find(
        (v) =>
          v.lang.includes("tl") ||
          (options.voiceName && v.name.includes(options.voiceName)),
      ) || this.voices.find((v) => v.lang.startsWith("tl"));

    if (preferredVoice) utterance.voice = preferredVoice;

    // Event handlers for emergency reliability
    utterance.onstart = () =>
      console.log("🗣️ Speaking:", text.substring(0, 50));
    utterance.onend = () => console.log("🗣️ Speech finished");
    utterance.onerror = (event) => {
      console.error("TTS Error:", event.error, event);
    };

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  stop() {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
    }
  }

  getAvailableTagalogVoices() {
    return this.voices.filter((v) => v.lang.includes("tl"));
  }
}
