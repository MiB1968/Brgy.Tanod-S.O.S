// src/server/services/elevenLabsService.ts
import { ElevenLabsClient } from 'elevenlabs';
import * as googleTTS from 'google-tts-api';
import { Readable } from 'stream';

let elevenLabsClient: ElevenLabsClient | null = null;

function getElevenLabs(): ElevenLabsClient {
  if (!elevenLabsClient) {
    const key = process.env.ELEVENLABS_API_KEY || 'dummy';
    elevenLabsClient = new ElevenLabsClient({ apiKey: key });
  }
  return elevenLabsClient;
}

export class JarvisVoiceService {
  private getVoiceId(): string {
    let id = process.env.JARVIS_VOICE_ID || "7tWz9X5zl45gE6bg2uiN";
    if (id.includes('voiceId=')) {
      const match = id.match(/voiceId=([A-Za-z0-9_-]+)/);
      if (match) {
        id = match[1];
      }
    }
    return id.trim();
  }

  async generateAudioStream(text: string): Promise<Readable | NodeJS.ReadableStream | null> {
    try {
      if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY !== 'dummy') {
        const audioStream = await getElevenLabs().generate({
          voice: this.getVoiceId(),
          model_id: "eleven_turbo_v2", // Fast & high quality
          text: text,
          voice_settings: {
            stability: 0.85,
            similarity_boost: 0.95,
            style: 0.45,           // Adds personality/emotion
            use_speaker_boost: true
          },
        });
        return audioStream;
      } else {
        throw new Error('Fallback to Google TTS');
      }
    } catch (error: any) {
      if (error?.message?.includes('402')) {
        console.warn("ElevenLabs quota exceeded, falling back to Google TTS.");
      } else if (!error?.message?.includes('Fallback')) {
        console.warn("ElevenLabs TTS Error:", error?.message || error, "- falling back to Google TTS");
      }
      return this.generateFallbackAudioStream(text);
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
      // Combine base64 strings
      const buffers = base64AudioArray.map(result => Buffer.from(result.base64, 'base64'));
      const combinedBuffer = Buffer.concat(buffers);
      
      const stream = new Readable();
      stream.push(combinedBuffer);
      stream.push(null);
      return stream;
    } catch (err: any) {
      console.warn("Google TTS fallback also failed:", err?.message);
      return null;
    }
  }
}

export const jarvisVoiceService = new JarvisVoiceService();
