// src/server/services/elevenLabsService.ts
import { ElevenLabsClient } from 'elevenlabs';
import { config } from '../config/index';
import * as googleTTS from 'google-tts-api';
import { Readable } from 'stream';

export class JarvisVoiceService {
  private elevenKeys: string[] = config.elevenLabs.apiKeys;
  private fishKeys: string[] = config.fishAudio.apiKeys;
  private currentElevenIndex = 0;
  private currentFishIndex = 0;

  private getVoiceId(): string {
    return config.elevenLabs.voiceId;
  }

  async generateAudioStream(text: string): Promise<Readable | NodeJS.ReadableStream | null> {
    // 1. Try ElevenLabs with Rotation
    if (this.elevenKeys.length > 0) {
      for (let i = 0; i < this.elevenKeys.length; i++) {
        const key = this.elevenKeys[this.currentElevenIndex];
        try {
          const client = new ElevenLabsClient({ apiKey: key });
          const audioStream = await client.generate({
            voice: this.getVoiceId(),
            model_id: "eleven_turbo_v2",
            text: text,
            voice_settings: {
              stability: 0.85,
              similarity_boost: 0.95,
              style: 0.45,
              use_speaker_boost: true
            },
          });
          return audioStream as Readable;
        } catch (error: any) {
          const errorMsg = error?.message || String(error);
          const isQuotaError = errorMsg.includes('quota') || errorMsg.includes('credit') || error?.status === 402 || error?.status === 429;
          const isAuthError = errorMsg.includes('401') || errorMsg.includes('invalid_api_key');

          if (isQuotaError || isAuthError) {
            console.log(`ElevenLabs key ${this.currentElevenIndex} (ending in ...${key.slice(-4)}) issues: ${errorMsg}. Rotating...`);
            this.currentElevenIndex = (this.currentElevenIndex + 1) % this.elevenKeys.length;
          } else {
            console.warn("ElevenLabs unexpected error:", errorMsg);
            break; // Stop loop and try fallback
          }
        }
      }
    }

    // 2. Fallback to Fish Audio (if configured)
    if (this.fishKeys.length > 0) {
      console.log("ElevenLabs exhausted/missing → Trying Fish Audio fallback");
      for (let i = 0; i < this.fishKeys.length; i++) {
        const key = this.fishKeys[this.currentFishIndex];
        try {
          return await this.callFishAudio(text, key);
        } catch (error: any) {
          const errorMsg = error?.message || String(error);
          if (errorMsg.includes('credit') || error?.status === 429) {
            console.log(`Fish Audio key ${this.currentFishIndex} issues. Rotating...`);
            this.currentFishIndex = (this.currentFishIndex + 1) % this.fishKeys.length;
          } else {
            console.warn("Fish Audio unexpected error:", errorMsg);
            break;
          }
        }
      }
    }

    // 3. Ultimate Fallback to Google TTS (Free/Stable)
    console.log("Premium TTS providers exhausted → Falling back to Google TTS");
    return this.generateFallbackAudioStream(text);
  }

  private async callFishAudio(text: string, apiKey: string): Promise<Readable | null> {
    try {
      const response = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          format: 'mp3', // Standard
          // Note: Fish Audio requires a voice_id which we'd typically put in env
          voice_id: process.env.FISH_AUDIO_VOICE_ID || "7fcf27b7b14041fd8489f074d2091475" // Default
        }),
      });

      if (!response.ok) {
        throw new Error(`Fish Audio status ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const stream = new Readable();
      stream.push(Buffer.from(buffer));
      stream.push(null);
      return stream;
    } catch (error) {
      throw error;
    }
  }

  private async generateFallbackAudioStream(text: string): Promise<Readable | null> {
    try {
      const base64AudioArray = await googleTTS.getAllAudioBase64(text, {
        lang: 'en',
        slow: false,
        host: 'https://translate.google.com',
        splitPunct: ',.?',
      });
      const buffers = base64AudioArray.map(result => Buffer.from(result.base64, 'base64'));
      const combinedBuffer = Buffer.concat(buffers);
      
      const stream = new Readable();
      stream.push(combinedBuffer);
      stream.push(null);
      return stream;
    } catch (err: any) {
      console.error("Critical: All TTS options (including Google) failed.", err?.message);
      return null;
    }
  }
}

export const jarvisVoiceService = new JarvisVoiceService();
