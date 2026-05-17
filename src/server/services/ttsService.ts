import fs from 'fs';
import path from 'path';

// ── Model paths (downloaded by scripts/download-models.sh) ──────────────────
const MODEL_DIR = path.resolve('src/server/models/supertonic');
const MODELS_AVAILABLE = fs.existsSync(MODEL_DIR);

export type TTSProvider = 'google' | 'supertonic';

export interface TTSCallOptions {
  text: string;
  format?: 'mp3' | 'wav';
}

// ── Lazy-loaded session (singleton) ─────────────────────────────────────────
let _session: any = null;

async function getSession(): Promise<any> {
  if (!_session) {
    const ort = await import('onnxruntime-node');
    const modelPath = path.join(MODEL_DIR, 'model.onnx');
    _session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['cpu'],  // CPU-only for server reliability
      graphOptimizationLevel: 'all',
    });
  }
  return _session;
}

class TTSService {
  constructor() {}

  /**
   * Generates speech following a fallback priority chain: 
   * 1. Google TTS (requires internet)
   * 2. Supertonic local inference (offline-capable)
   */
  async generateSpeech(options: TTSCallOptions): Promise<Buffer> {
    const { text } = options;
    if (!text) throw new Error("Text is required for TTS");

    // 1. Try Google TTS (requires internet)
    try {
      return await this.generateGoogleTTS(text);
    } catch { /* quota or network error — fall through to Supertonic */ }

    // 2. Try Supertonic local inference (offline-capable)
    if (MODELS_AVAILABLE) {
      try {
        return await this.supertonicGenerate(text);
      } catch (err) {
        console.warn('[TTS] Supertonic failed:', err);
      }
    }
    
    // 3. Fallback: Edge TTS (Free, no credentials needed)
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

    throw new Error("All TTS providers failed.");
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

  /**
   * Supertonic ONNX inference
   * [ASSUMPTION]: Official supertone-inc/supertonic Node.js tokenization and decoding logic should be implemented here.
   */
  private async supertonicGenerate(text: string): Promise<Buffer> {
    const session = await getSession();
    // Tokenize text → run inference → decode WAV
    // (Follow official Supertonic Node.js example in their repo: js/node/)
    // Returns raw PCM → wrap in WAV header → return as Buffer
    throw new Error('Implement using supertone-inc/supertonic js/node/ example');
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
