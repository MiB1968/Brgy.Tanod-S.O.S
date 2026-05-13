// src/services/voiceAssistantService.ts
// CLIENT-SIDE — No API keys. No external AI calls. Socket.IO only.
import socket from '../lib/socket';

export type VoiceStateCallback = (connected: boolean) => void;
export type VoiceMessageCallback = (text: string, audioBase64?: string) => void;
export type VoiceErrorCallback = (error: { code: string; message: string }) => void;

class VoiceAssistantService {
  private _isConnected = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private synth: SpeechSynthesis | null = null;
  private activeAudio: HTMLAudioElement | null = null;

  private onStateCb: VoiceStateCallback | null = null;
  private onMessageCb: VoiceMessageCallback | null = null;
  private onErrorCb: VoiceErrorCallback | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
    }
    this.bindSocketEvents();
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  // ── Callback registration ─────────────────────────────────────────────
  setCallbacks(
    onState: VoiceStateCallback,
    onMessage: VoiceMessageCallback,
    onError: VoiceErrorCallback
  ) {
    this.onStateCb = onState;
    this.onMessageCb = onMessage;
    this.onErrorCb = onError;
  }

  // ── Socket event listeners (server → client) ─────────────────────────
  private bindSocketEvents() {
    // Server sends back Jarvis text reply
    socket.on('jarvis:reply', (data: { text: string; audioBase64?: string }) => {
      if (this.onMessageCb) this.onMessageCb(data.text, data.audioBase64);
      // NOTE: Automatic playback is handled by the component or hook that initiated the request
    });

    // Server signals session open/close
    socket.on('jarvis:session-open', () => {
      this._isConnected = true;
      if (this.onStateCb) this.onStateCb(true);
      console.log('[VoiceAssistant] Session established via server proxy');
    });

    socket.on('jarvis:session-closed', () => {
      this._isConnected = false;
      if (this.onStateCb) this.onStateCb(false);
      console.log('[VoiceAssistant] Session closed');
    });

    socket.on('jarvis:error', (err: { code: string; message: string }) => {
      console.error('[VoiceAssistant] Server error:', err);
      if (this.onErrorCb) this.onErrorCb(err);
    });

    socket.on('jarvis:stop-audio', () => {
      this.cancelAudio();
    });

    socket.on('voice-error', (err: { code: string; message: string }) => {
      console.error('[VoiceAssistant] Voice error:', err);
      if (this.onErrorCb) this.onErrorCb(err);
    });
  }

  // ── Session management ────────────────────────────────────────────────

  /**
   * Request the server to open a Gemini Live session.
   * The server holds the API key — we just request the session.
   */
  async startSession(): Promise<void> {
    if (this._isConnected) {
      console.warn('[VoiceAssistant] Session already active');
      return;
    }

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Tell server to open a Gemini Live session for this socket
      socket.emit('jarvis:start-session');

      // Start sending audio chunks once server confirms open (jarvis:session-open)
      socket.once('jarvis:session-open', () => {
        this.startAudioCapture();
      });
    } catch (err: any) {
      console.error('[VoiceAssistant] Failed to get microphone:', err);
      if (this.onErrorCb) {
        this.onErrorCb({
          code: 'MIC_ERROR',
          message: 'Microphone access denied. Please allow microphone in browser settings.',
        });
      }
    }
  }

  private startAudioCapture() {
    if (!this.audioStream) return;

    // Interrupt any ongoing Jarvis speech when user starts a new capture
    this.cancelAudio();

    this.mediaRecorder = new MediaRecorder(this.audioStream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this._isConnected) {
        // Use native binary ArrayBuffer instead of Base64 to reduce overhead
        const arrayBuffer = await event.data.arrayBuffer();
        socket.emit('jarvis:audio-chunk', { data: arrayBuffer, mimeType: 'audio/webm;codecs=opus' });
      }
    };

    // Send chunks every 250ms for low-latency streaming
    this.mediaRecorder.start(250);
    console.log('[VoiceAssistant] Audio capture started');
  }

  disconnect() {
    // Tell server to close the Gemini Live session
    if (this._isConnected) {
      socket.emit('jarvis:end-session');
    }

    this._isConnected = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    if (this.onStateCb) this.onStateCb(false);
    console.log('[VoiceAssistant] Disconnected');
  }

  public stopAudio() {
    this.cancelAudio();
  }

  private cancelAudio() {
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }
  }

  // ── Text-to-Speech (fallback when server sends no audio) ─────────────
  public speak(text: string, onEnd?: () => void) {
    this.fallbackSpeak(text, onEnd);
  }

  private fallbackSpeak(text: string, onEnd?: () => void) {
    if (!this.synth) return;
    try {
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = this.synth.getVoices();
      const preferred = voices.find(
        (v) => v.name.includes('Google') || v.name.includes('Premium')
      );
      if (preferred) utterance.voice = preferred;
      utterance.pitch = 0.9;
      utterance.rate = 1.0;
      utterance.volume = 1.0;
      if (onEnd) utterance.onend = onEnd;
      this.synth.speak(utterance);
    } catch (err) {
      console.error('[VoiceAssistant] Fallback TTS error:', err);
      if (onEnd) onEnd();
    }
  }

  // ── Audio playback ────────────────────────────────────────────────────
  private async playBase64Audio(base64: string) {
    try {
      this.cancelAudio();
      
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.activeAudio = audio;
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (this.activeAudio === audio) this.activeAudio = null;
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (this.activeAudio === audio) this.activeAudio = null;
      };
      
      await audio.play();
    } catch (err) {
      console.error('[VoiceAssistant] Audio playback error:', err);
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data URL prefix (data:audio/...;base64,)
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const voiceAssistant = new VoiceAssistantService();
