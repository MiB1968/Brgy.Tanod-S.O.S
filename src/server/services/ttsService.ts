import fs from 'fs';
import path from 'path';

// ── Model paths ──────────────────────────────────────────────
const MODEL_DIR = path.resolve('src/server/models/supertonic');
const MODELS_AVAILABLE = fs.existsSync(MODEL_DIR);

export type TTSProvider = 'google' | 'supertonic';

export interface TTSCallOptions {
  text: string;
  format?: 'mp3' | 'wav';
}

class TTSService {
  constructor() {}

  /**
   * Generates speech following a fallback priority chain: 
   * 1. Gemini TTS
   * 2. Edge TTS
   * 3. Google TTS
   */
  async generateSpeech(options: TTSCallOptions): Promise<Buffer> {
    const { text } = options;
    if (!text) throw new Error("Text is required for TTS");

    // 1. Try Gemini TTS for a polished, highly realistic voice
    if (process.env.GEMINI_API_KEY_NEW || process.env.GEMINI_API_KEY) {
       try {
         return await this.generateGeminiTTS(text);
       } catch (err: any) {
         const errMsg = err.message || String(err);
         const isKeyError = errMsg.includes('API key expired') || errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key');
         if (isKeyError) {
           console.warn('[TTS] Gemini TTS failed: API key has expired or is invalid. Falling back to edge/local TTS.');
         } else {
           console.warn('[TTS] Gemini TTS failed, falling back:', err);
         }
       }
    }

    // 2. Try Fallback: Edge TTS (Free, no credentials needed)
    try {
      const { EdgeTTS } = await import('@andresaya/edge-tts');
      const edgeTtsClient = new EdgeTTS();
      await edgeTtsClient.synthesize(text, 'fil-PH-BlessicaNeural', {
        rate: '+0%',
        volume: '+0%',
        pitch: '+0Hz'
      });
      return edgeTtsClient.toBuffer();
    } catch (err) {
      console.warn('[TTS] EdgeTTS fallback failed:', err);
    }

    // 3. Try Google TTS (requires internet)
    try {
      return await this.generateGoogleTTS(text);
    } catch { /* quota or network error */ }

    throw new Error("All TTS providers failed.");
  }

  private async generateGeminiTTS(text: string): Promise<Buffer> {
    const { GoogleGenAI, Modality } = await import('@google/genai');
    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY_NEW || process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO], // MUST BE 1 Modality: AUDIO
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Zephyr, Fenrir, Kore, Puck, Charon
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const pcmData = Buffer.from(base64Audio, 'base64');
      
      const sampleRate = 24000;
      const dataLength = pcmData.length;
      const header = Buffer.alloc(44);
      header.write('RIFF', 0);
      header.writeUInt32LE(36 + dataLength, 4);
      header.write('WAVE', 8);
      header.write('fmt ', 12);
      header.writeUInt32LE(16, 16);
      header.writeUInt16LE(1, 20);
      header.writeUInt16LE(1, 22);
      header.writeUInt32LE(sampleRate, 24);
      header.writeUInt32LE(sampleRate * 2, 28);
      header.writeUInt16LE(2, 32);
      header.writeUInt16LE(16, 34);
      header.write('data', 36);
      header.writeUInt32LE(dataLength, 40);
      
      return Buffer.concat([header, pcmData]);
    }
    throw new Error('No audio returned from Gemini TTS');
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
        throw new Error("Google TTS provider failed.");
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
