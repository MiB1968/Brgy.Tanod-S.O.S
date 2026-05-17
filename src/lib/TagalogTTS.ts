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
      const loadVoices = () => {
        this.voices = speechSynthesis.getVoices();
        this.isReady = true;
        resolve();
      };

      if (speechSynthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    });
  }
}
