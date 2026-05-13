import fs from 'fs';
import path from 'path';

export type TTSProvider = 'google';

export interface TTSCallOptions {
  text: string;
  format?: 'mp3' | 'wav';
}

class TTSService {
  constructor() {}

  async generateSpeech(options: TTSCallOptions): Promise<Buffer> {
    const { text } = options;
    if (!text) throw new Error("Text is required for TTS");

    return await this.generateGoogleTTS(text);
  }

  private async generateGoogleTTS(text: string): Promise<Buffer> {
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
        console.error("Google TTS failed:", err);
        throw new Error("TTS provider failed.");
    }
  }

  async saveAudio(buffer: Buffer, filename: string): Promise<string> {
    const dir = path.join(process.cwd(), 'public/alerts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/alerts/${filename}`;
  }
}

export const ttsService = new TTSService();
