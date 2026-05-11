import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { PCMPlayer, PCMRecorder } from '../lib/audioManager';

// We'll manage session state here
class VoiceAssistantService {
  private ai: GoogleGenAI;
  private sessionPromise: any = null;
  private player: PCMPlayer | null = null;
  private recorder: PCMRecorder | null = null;
  
  public isConnected = false;
  
  private onMessageCb: ((msg: LiveServerMessage) => void) | null = null;
  private onStateChangeCb: ((connected: boolean) => void) | null = null;
  private onToolCallCb: ((functionCalls: any[]) => Promise<any[]>) | null = null;
  private synth: SpeechSynthesis | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
    }
  }

  /**
   * Professional Text-to-Speech Fallback (Jarvis Vocalizer)
   */
  public speak(text: string, voiceName: 'Zephyr' | 'Nova' = 'Zephyr') {
    if (!this.synth) return;
    this.synth.cancel(); // Interrupt previous speech

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = this.synth.getVoices();
    
    // Attempt to find a high-quality voice
    const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Premium'));
    if (preferred) utterance.voice = preferred;

    utterance.pitch = 0.9; // Lower pitch for Jarvis-style depth
    utterance.rate = 1.0;
    utterance.volume = 1.0;

    this.synth.speak(utterance);
  }

  public setCallbacks(
    onMessage: (msg: LiveServerMessage) => void, 
    onStateChange: (state: boolean) => void,
    onToolCall?: (functionCalls: any[]) => Promise<any[]>
  ) {
    this.onMessageCb = onMessage;
    this.onStateChangeCb = onStateChange;
    this.onToolCallCb = onToolCall || null;
  }

  public async startSession(systemInstruction: string, tools?: any[]) {
    try {
      this.player = new PCMPlayer();
      this.recorder = new PCMRecorder((base64Data) => {
        if (this.sessionPromise) {
          this.sessionPromise.then((session: any) => {
            session.sendRealtimeInput({
              audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
            });
          });
        }
      });

      console.log("[VoiceAssistant] Connecting to Gemini Live API...");
      
      this.sessionPromise = this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            console.log("[VoiceAssistant] Connection opened");
            this.isConnected = true;
            if (this.onStateChangeCb) this.onStateChangeCb(true);
            this.recorder?.start();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (this.onMessageCb) this.onMessageCb(message);

            // Handle Audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              await this.player?.playChunk(base64Audio);
            }
            // Handle interrupt
            if (message.serverContent?.interrupted) {
              console.log("[VoiceAssistant] Interrupted by user");
            }

            // Handle tool calls
            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && this.onToolCallCb) {
                console.log("[VoiceAssistant] Received tool call", functionCalls);
                const responses = await this.onToolCallCb(functionCalls);
                this.sendToolResponse(responses);
            }
          },
          onclose: () => {
            console.log("[VoiceAssistant] Connection closed");
            this.disconnect();
          },
          onerror: (err: any) => {
            console.error("[VoiceAssistant] Error:", err);
            this.disconnect();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction,
          tools: tools || [],
          // @ts-ignore Let's pass transcription config if needed
          systemInstruction: { parts: [{ text: systemInstruction}] },
          // @ts-ignore
          // In some beta types transcription is added here. Let's not strict check for now.
        },
      });

    } catch (err) {
      console.error("[VoiceAssistant] Error starting session:", err);
      this.disconnect();
    }
  }

  public async sendToolResponse(functionResponses: any[]) {
     if (this.sessionPromise) {
        this.sessionPromise.then((session: any) => {
            session.sendToolResponse({ functionResponses });
        });
     }
  }

  public disconnect() {
    this.isConnected = false;
    if (this.onStateChangeCb) this.onStateChangeCb(false);
    
    if (this.sessionPromise) {
      this.sessionPromise.then((session: any) => session.close()).catch(console.error);
      this.sessionPromise = null;
    }
    
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    
    if (this.player) {
      this.player.stop();
      this.player = null;
    }
  }
}

export const voiceAssistant = new VoiceAssistantService();
