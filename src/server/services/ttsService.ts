import { ElevenLabsClient } from 'elevenlabs';
import { FishAudioClient } from 'fish-audio';
import { EdgeTTS } from '@andresaya/edge-tts';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type TTSProvider = 'elevenlabs' | 'fish' | 'edge' | 'auto';

export interface TTSCallOptions {
  text: string;
  voiceId?: string;           // Provider-specific voice ID
  referenceAudioPath?: string; // For Fish cloning
  stability?: number;
  similarityBoost?: number;
  speed?: number;
  format?: 'mp3' | 'wav';
  priority?: 'quality' | 'cost'; // quality = ElevenLabs first
}

class TTSService {
  private elevenKeys: string[];
  private fishKeys: string[];
  private currentElevenIndex = 0;
  private currentFishIndex = 0;

  constructor() {
    this.elevenKeys = config.elevenLabs.apiKeys;
    this.fishKeys = config.fishAudio.apiKeys;

    if (this.elevenKeys.length === 0) console.warn("⚠️ No ElevenLabs keys found");
    if (this.fishKeys.length === 0) console.warn("⚠️ No Fish Audio keys found");
  }

  private getNextElevenKey() {
    const key = this.elevenKeys[this.currentElevenIndex] || "";
    this.currentElevenIndex = (this.currentElevenIndex + 1) % this.elevenKeys.length;
    return key;
  }

  private getNextFishKey() {
    const key = this.fishKeys[this.currentFishIndex] || "";
    this.currentFishIndex = (this.currentFishIndex + 1) % this.fishKeys.length;
    return key;
  }

  async generateSpeech(options: TTSCallOptions): Promise<Buffer> {
    const { text } = options;

    if (!text) throw new Error("Text is required for TTS");

    // Strategy: Try Edge as priority, then ElevenLabs, then Fish
    const providers: TTSProvider[] = ['edge', 'elevenlabs', 'fish'];

    for (const provider of providers) {
      try {
        if (provider === 'edge') {
          return await this.callEdgeTTS(options);
        } else if (provider === 'elevenlabs' && this.elevenKeys.length > 0) {
          // Attempt rotation within ElevenLabs
          for (let i = 0; i < this.elevenKeys.length; i++) {
            try {
              return await this.callElevenLabs(options);
            } catch (err: any) {
              if (this.isQuotaError(err)) {
                this.getNextElevenKey();
                continue;
              }
              throw err;
            }
          }
        } else if (provider === 'fish' && this.fishKeys.length > 0) {
          for (let i = 0; i < this.fishKeys.length; i++) {
            try {
              return await this.callFishAudio(options);
            } catch (err: any) {
              if (this.isQuotaError(err)) {
                this.getNextFishKey();
                continue;
              }
              throw err;
            }
          }
        }
      } catch (error: any) {
        console.error(`❌ Error with ${provider}:`, error.message);
        continue;
      }
    }

    console.warn("Premium TTS exhausted. Using basic fallback.");
    return await this.fallbackTTS(text);
  }

  private isQuotaError(error: any): boolean {
    const msg = error.message?.toLowerCase() || '';
    const status = error.status || error.statusCode || error.response?.status || error.response?.statusCode;
    return msg.includes('quota') || 
           msg.includes('credit') || 
           msg.includes('unauthorized') ||
           status === 402 || 
           status === 429 || 
           status === 401 || 
           error.code === 'insufficient_funds';
  }

  private async callEdgeTTS(options: TTSCallOptions): Promise<Buffer> {
    // Check if voiceId is actually an Edge ID. If not, default to Filipino male.
    const voice = (options.voiceId && options.voiceId.includes('Neural')) ? options.voiceId : 'fil-PH-FilipinoNeural';
    
    console.log(`[EdgeTTS] Using Voice ID: ${voice}`);
    const communicator = new EdgeTTS();
    // @ts-ignore
    const readable = await communicator.synthesizeStream(options.text, voice, {
      rate: '+0%',
      pitch: '+0Hz',
    });
    
    console.log(`[EdgeTTS] Got readable stream: ${!!readable}, type: ${typeof readable}`);
    
    const chunks: Buffer[] = [];
    for await (const chunk of readable) {
      console.log(`[EdgeTTS] Received chunk of size ${chunk.length}`);
      chunks.push(chunk as Buffer);
    }
    console.log(`[EdgeTTS] Stream finished, total chunks: ${chunks.length}, total size: ${chunks.reduce((acc, c) => acc + c.length, 0)}`);
    return Buffer.concat(chunks);
  }

  private async callElevenLabs(options: TTSCallOptions): Promise<Buffer> {
    const key = this.getNextElevenKey();
    if (!key) throw new Error("No ElevenLabs key available");
    
    const client = new ElevenLabsClient({ apiKey: key });

    // Validate voiceId is ElevenLabs compatible
    const voiceId = (options.voiceId && options.voiceId.length > 20 && !options.voiceId.includes('Neural')) ? options.voiceId : config.elevenLabs.voiceId;
    
    console.log(`[ElevenLabs] Using Voice ID: ${voiceId}`);
    const audio = await client.generate({
      voice: voiceId,
      text: options.text,
      model_id: "eleven_turbo_v2_5",
      output_format: options.format === 'wav' ? "pcm_44100" : "mp3_44100_128",
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }

  private async callFishAudio(options: TTSCallOptions): Promise<Buffer> {
    const key = this.getNextFishKey();
    if (!key) throw new Error("No Fish Audio key available");

    const client = new FishAudioClient({ apiKey: key });

    let audioStream;

    if (options.referenceAudioPath) {
      const referenceBuffer = fs.readFileSync(options.referenceAudioPath);
      const file = new File([referenceBuffer], 'reference.wav', { type: 'audio/wav' });
      
      audioStream = await client.textToSpeech.convert({
        text: options.text,
        references: [{
          audio: file as any,
          text: "Reference voice",
        }],
        format: options.format || 'mp3',
        speed: options.speed || 1.05,
      } as any);
    } else {
      audioStream = await client.textToSpeech.convert({
        text: options.text,
        reference_id: options.voiceId || process.env.FISH_AUDIO_VOICE_ID || "7fcf27b7b14041fd8489f074d2091475",
        format: options.format || 'mp3',
      });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }

  private async fallbackTTS(text: string): Promise<Buffer> {
    try {
        const googleTTS = await import('google-tts-api');
        const results = await googleTTS.getAllAudioBase64(text, {
          lang: 'tl',
          slow: false,
          host: 'https://translate.google.com',
        });
        
        const buffers = results.map((r: any) => Buffer.from(r.base64, 'base64'));
        return Buffer.concat(buffers);
    } catch (err) {
        console.error("Fallback TTS failed:", err);
        throw new Error("All TTS providers failed, including fallback.");
    }
  }

  async saveAudio(buffer: Buffer, filename: string): Promise<string> {
    const dir = path.join(__dirname, '../../public/alerts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/alerts/${filename}`;
  }
}

export const ttsService = new TTSService();
