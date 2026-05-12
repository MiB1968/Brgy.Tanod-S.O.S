/**
 * Professional Voice Intelligence Service
 * Handles Speech Recognition (STT) and Synthesis (TTS)
 */
import edgeTTS from '@andresaya/edge-tts';

export interface VoiceOptions {
  voice?: string;
  rate?: string;
  pitch?: string;
  volume?: string;
}

class VoiceService {
  private static instance: VoiceService;
  public defaultVoice = 'fil-PH-BlessicaNeural';

  private isSpeaking = false;

  private constructor() {}

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  async speak(text: string, options: VoiceOptions = {}): Promise<void> {
    if (this.isSpeaking) return;
    this.isSpeaking = true;

    try {
      const response = await fetch('/api/system/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: options.voice || this.defaultVoice,
          rate: options.rate || '+0%',
          pitch: options.pitch || '+0Hz',
          volume: options.volume || '+0%',
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        await new Promise<void>((resolve) => {
          audio.onended = () => { URL.revokeObjectURL(url); this.isSpeaking = false; resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); this.isSpeaking = false; resolve(); };
          audio.play();
        });
        return;
      }
    } catch (err) {
      console.warn('Edge TTS failed, using browser fallback');
    }

    // Browser Fallback
    await this.speakWithBrowser(text, options);
    this.isSpeaking = false;
  }

  private async speakWithBrowser(text: string, options: VoiceOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) return resolve();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fil-PH';
      utterance.rate = 0.95;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const filVoice = voices.find(v => v.lang.includes('fil') || v.name.toLowerCase().includes('filipino'));
      if (filVoice) utterance.voice = filVoice;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }

  startListening(onResult: (text: string, isFinal: boolean) => void, onError?: (err: any) => void) {
    const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      onError?.({ message: 'Speech recognition not supported' });
      return null;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fil-PH';

    recognition.onresult = (event: any) => {
      let transcript = '';
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        isFinal = event.results[i].isFinal;
      }
      onResult(transcript, isFinal);
    };

    recognition.onerror = onError || console.error;
    recognition.start();

    return recognition;
  }

  stopListening(recognition: any) {
    if (recognition) recognition.stop();
  }
}

export const voiceService = VoiceService.getInstance();
