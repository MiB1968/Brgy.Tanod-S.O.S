import { ElevenLabsClient } from 'elevenlabs';
import { FishAudioClient } from 'fish-audio';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type TTSProvider = 'elevenlabs' | 'fish' | 'auto';

export interface TTSCallOptions {
  text: string;
  voiceId?: string;           // ElevenLabs voice ID
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
    const key = this.elevenKeys[this.currentElevenIndex];
    this.currentElevenIndex = (this.currentElevenIndex + 1) % this.elevenKeys.length;
    return key;
  }

  private getNextFishKey() {
    const key = this.fishKeys[this.currentFishIndex];
    this.currentFishIndex = (this.currentFishIndex + 1) % this.fishKeys.length;
    return key;
  }

  async generateSpeech(options: TTSCallOptions): Promise<Buffer> {
    const { text, priority = 'quality' } = options;

    if (!text) throw new Error("Text is required for TTS");

    // Strategy: Try quality first unless cost priority
    const providers = priority === 'cost' 
      ? ['fish', 'elevenlabs'] 
      : ['elevenlabs', 'fish'];

    for (const provider of providers) {
      try {
        if (provider === 'elevenlabs' && this.elevenKeys.length > 0) {
          // Attempt rotation within ElevenLabs
          for (let i = 0; i < this.elevenKeys.length; i++) {
            try {
              return await this.callElevenLabs(options);
            } catch (err: any) {
              if (this.isQuotaError(err)) {
                console.log(`🔄 ElevenLabs key rotating...`);
                this.getNextElevenKey(); // Force skip this key next time
                continue;
              }
              throw err;
            }
          }
        } else if (provider === 'fish' && this.fishKeys.length > 0) {
          // Attempt rotation within Fish
          for (let i = 0; i < this.fishKeys.length; i++) {
            try {
              return await this.callFishAudio(options);
            } catch (err: any) {
              if (this.isQuotaError(err)) {
                console.log(`🔄 Fish Audio key rotating...`);
                this.getNextFishKey();
                continue;
              }
              throw err;
            }
          }
        }
      } catch (error: any) {
        if (this.isQuotaError(error)) {
          console.log(`🔄 ${provider.toUpperCase()} fully exhausted. Trying next provider...`);
          continue; 
        } else {
          console.error(`❌ Error with ${provider}:`, error.message);
          // Don't throw yet, try next provider
        }
      }
    }

    // Ultimate fallback if premium fails
    console.warn("Premium TTS exhausted. Using basic fallback.");
    return await this.fallbackTTS(text);
  }

  private isQuotaError(error: any): boolean {
    const msg = error.message?.toLowerCase() || '';
    return msg.includes('quota') || 
           msg.includes('credit') || 
           error.status === 402 || 
           error.status === 429 || 
           error.code === 'insufficient_funds';
  }

  private async callElevenLabs(options: TTSCallOptions): Promise<Buffer> {
    const key = this.getNextElevenKey();
    if (!key) throw new Error("No ElevenLabs key available");
    
    const client = new ElevenLabsClient({ apiKey: key });

    const audio = await client.generate({
      voice: options.voiceId || config.elevenLabs.voiceId || "Rachel",
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
      // Create a File object as expected by the SDK
      const file = new File([referenceBuffer], 'reference.wav', { type: 'audio/wav' });
      
      audioStream = await client.textToSpeech.convert({
        text: options.text,
        references: [{
          audio: file as any, // Cast to any if File type defined in SDK differs from global Node File
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
    // Basic Google TTS implementation as ultimate failover
    try {
        const { default: googleTTS } = await import('google-tts-api');
        const results = await googleTTS.getAllAudioBase64(text, {
          lang: 'en',
          slow: false,
          host: 'https://translate.google.com',
        });
        
        const buffers = results.map(r => Buffer.from(r.base64, 'base64'));
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
