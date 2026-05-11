
/**
 * Professional Voice Intelligence Service
 * Handles Speech Recognition (STT) and Synthesis (TTS)
 */
class VoiceService {
  private recognition: any = null;
  private synth: SpeechSynthesis | null = null;
  private isListening = false;
  private retryCount = 0;
  private maxRetries = 3;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      this.setupRecognition();
    }
  }

  private setupRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      
      // Mobile optimization: handle low-end devices by allowing both Tagalog and English loosely if needed
      // But for now sticking to en-US as requested
    }
  }

  /**
   * Jarvis-style Vocalizer (TTS)
   * Prioritizes ElevenLabs via backend, fallbacks to browser TTS
   */
  public async speak(text: string, onEnd?: () => void) {
    // Try ElevenLabs via backend first
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ text })
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            if (onEnd) onEnd();
          };

          audio.onerror = (e) => {
            console.error('[ElevenLabs] Audio playback error:', e);
            this.fallbackSpeak(text, onEnd);
          };

          await audio.play();
          console.log('[Guardian AI] Speaking (ElevenLabs):', text);
          return;
        } else {
          console.warn('[ElevenLabs] Backend failed or not configured, using fallback.');
        }
      }
    } catch (err) {
      console.error('[ElevenLabs] Fetch failed:', err);
    }

    // Fallback to browser TTS
    this.fallbackSpeak(text, onEnd);
  }

  private fallbackSpeak(text: string, onEnd?: () => void) {
    if (!this.synth) return;
    try {
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = this.synth.getVoices();
      
      // Choose a professional sounding voice
      const preferred = ['Google US English', 'Microsoft David', 'en-US-Standard-C'];
      const voice = voices.find(v => preferred.some(p => v.name.includes(p))) || 
                    voices.find(v => v.name.includes('Premium')) || 
                    voices[0];
      
      if (voice) utterance.voice = voice;

      utterance.pitch = 0.9;
      utterance.rate = 1.0;
      utterance.volume = 1.0;

      if (onEnd) utterance.onend = onEnd;
      
      utterance.onerror = (e) => {
        console.error('[TTS Error]', e);
        if (onEnd) onEnd();
      };

      this.synth.speak(utterance);
      console.log('[Guardian AI] Speaking (Fallback):', text);
    } catch (err) {
      console.error('[Voice] Speak failed:', err);
      if (onEnd) onEnd();
    }
  }

  /**
   * Starts listening for tactical commands
   */
  public startListening(onResult: (text: string, isFinal: boolean) => void, onError: (err: any) => void) {
    if (!this.recognition || this.isListening) return;

    this.recognition.onresult = (event: any) => {
      this.retryCount = 0; // Reset on success
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      onResult(text, result.isFinal);
    };

    this.recognition.onerror = (err: any) => {
      console.error('[Voice] Recognition Error:', err.error);
      
      if (err.error === 'network' && this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`[Voice] Retrying (${this.retryCount}/${this.maxRetries})...`);
        setTimeout(() => this.startListening(onResult, onError), 1000 * this.retryCount);
        return;
      }

      onError(err);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        try {
          this.recognition.start(); // Auto-restart for continuous mode
        } catch (e) {
          console.warn('[Voice] Failed to auto-restart');
        }
      }
    };

    try {
      this.isListening = true;
      this.recognition.start();
      console.log('[Guardian AI] Listening Mode: ACTIVE');
    } catch (e) {
      console.error('[Voice] Start error:', e);
      this.isListening = false;
      this.setupRecognition(); // Re-init on hard fail
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
