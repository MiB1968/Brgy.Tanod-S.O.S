
/**
 * Professional Voice Intelligence Service
 * Handles Speech Recognition (STT) and Synthesis (TTS)
 */
class VoiceService {
  private recognition: any = null;
  private synth: SpeechSynthesis | null = null;
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
      }
    }
  }

  /**
   * Jarvis-style Vocalizer (TTS)
   */
  public speak(text: string, onEnd?: () => void) {
    if (!this.synth) return;
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = this.synth.getVoices();
    
    // Choose a professional sounding voice
    const voice = voices.find(v => v.name.includes('Google') || v.name.includes('Premium')) || voices[0];
    if (voice) utterance.voice = voice;

    utterance.pitch = 0.9;
    utterance.rate = 1.0;
    utterance.volume = 1.0;

    if (onEnd) utterance.onend = onEnd;

    this.synth.speak(utterance);
    console.log('[Guardian AI] Speaking:', text);
  }

  /**
   * Starts listening for tactical commands
   */
  public startListening(onResult: (text: string, isFinal: boolean) => void, onError: (err: any) => void) {
    if (!this.recognition || this.isListening) return;

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      onResult(text, result.isFinal);
    };

    this.recognition.onerror = (err: any) => {
      console.error('[Voice] Error:', err);
      onError(err);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        try {
          this.recognition.start(); // Auto-restart if we're supposed to be listening
        } catch (e) {}
      }
    };

    try {
      this.isListening = true;
      this.recognition.start();
      console.log('[Guardian AI] Listening Mode: ACTIVE');
    } catch (e) {
      this.isListening = false;
    }
  }

  public stopListening() {
    this.isListening = false;
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  public cancelSpeech() {
    if (this.synth) this.synth.cancel();
  }
}

export const voiceService = new VoiceService();
