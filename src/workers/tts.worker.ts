// src/workers/tts.worker.ts
import * as ort from 'onnxruntime-web';

// LOW-END OPTIMIZED WASM CONFIG
(ort.env.wasm as any).wasmPaths = {
  'ort-wasm.wasm': '/onnx/ort-wasm.wasm',
  'ort-wasm-simd.wasm': '/onnx/ort-wasm-simd.wasm',
  'ort-wasm-threaded.wasm': '/onnx/ort-wasm-threaded.wasm',
  'ort-wasm-simd-threaded.wasm': '/onnx/ort-wasm-simd-threaded.wasm',
};

ort.env.wasm.proxy = true;
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;
ort.env.logLevel = 'error';

let sessions: any = { textEncoder: null, durationPredictor: null, vectorEstimator: null, vocoder: null };
let config: any = null;
let unicodeIndexer: Map<string, number> = new Map();

// Reusable tensors
let inputIdsTensor: ort.Tensor | null = null;
let attentionMaskTensor: ort.Tensor | null = null;

function isLowEndDevice() {
  const mem = (navigator as any).deviceMemory || 4;
  return mem < 4;
}

function normalizeTagalog(text: string): string {
  return text
    .toLowerCase()
    .replace(/ñ/g, 'ny')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9\s.,!?'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadConfigAndIndexer(basePath = '/models/supertonic') {
  // Try quantized config first, then fallback
  try {
    const res = await fetch(`${basePath}/quantized/tts.json`).then(r => r.json());
    config = res;
  } catch {
    const res = await fetch(`${basePath}/tts.json`).then(r => r.json()).catch(() => ({}));
    config = res;
  }

  try {
    const res = await fetch(`${basePath}/quantized/unicode_indexer.json`).then(r => r.json());
    unicodeIndexer = new Map(Object.entries(res).map(([k, v]) => [k, Number(v)]));
  } catch {
    const res = await fetch(`${basePath}/unicode_indexer.json`).then(r => r.json()).catch(() => ({}));
    unicodeIndexer = new Map(Object.entries(res).map(([k, v]) => [k, Number(v)]));
  }
}

async function createSession(modelName: string, label: string, basePath = '/models/supertonic') {
  const lowEnd = isLowEndDevice();
  const paths = [
    `${basePath}/quantized/${modelName}.onnx`,   // Priority: Quantized
    `${basePath}/${modelName}.onnx`,             // Original FP32
  ];

  for (const modelPath of paths) {
    try {
      const opts: ort.InferenceSession.SessionOptions = {
        graphOptimizationLevel: 'all',
        executionProviders: lowEnd ? ['wasm'] : ['webgpu', 'wasm'],
        intraOpNumThreads: 1,
        enableMemPattern: true,
        enableCpuMemArena: !lowEnd,
        executionMode: 'sequential',
      };

      const session = await ort.InferenceSession.create(modelPath, opts);
      console.log(`[TTS] ${label} loaded from ${modelPath} | LowEnd: ${lowEnd}`);
      return session;
    } catch (e) {
      console.warn(`[TTS] Failed to load ${modelPath}`, e);
    }
  }
  throw new Error(`Failed to load ${label}`);
}

async function initSessions(basePath = '/models/supertonic') {
  sessions.textEncoder = await createSession('text_encoder', 'Text Encoder', basePath);
  sessions.durationPredictor = await createSession('duration_predictor', 'Duration Predictor', basePath);
  sessions.vectorEstimator = await createSession('vector_estimator', 'Vector Estimator', basePath);
  sessions.vocoder = await createSession('vocoder', 'Vocoder', basePath);
}

function encodeText(text: string, lang = 'tl') {
  const normalized = normalizeTagalog(text);
  const tagged = `<${lang}>${normalized}</${lang}>`;
  const chars = Array.from(tagged);

  const inputIds: bigint[] = [];
  const attentionMask: bigint[] = [];

  for (const char of chars) {
    const idx = unicodeIndexer.get(char) ?? unicodeIndexer.get(' ') ?? 0;
    inputIds.push(BigInt(idx));
    attentionMask.push(1n);
  }

  return { inputIds: new BigInt64Array(inputIds), attentionMask: new BigInt64Array(attentionMask), length: inputIds.length };
}

function createWavBuffer(audioData: Float32Array, sampleRate = 24000): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + audioData.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + audioData.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, audioData.length * 2, true);

  let offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    const s = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  return buffer;
}

// =============================================
// Main Handler
// =============================================

const ctx: Worker = self as any;

ctx.onmessage = async (e: MessageEvent) => {
  const { type, text, lang = 'tl' } = e.data;

  try {
    if (type === 'INIT') {
      await loadConfigAndIndexer();
      await initSessions();
      ctx.postMessage({ type: 'READY' });
      return;
    }

    if (type === 'SPEAK') {
      if (!sessions.textEncoder) throw new Error('Models not initialized');

      const start = performance.now();
      const encoded = encodeText(text, lang);

      // Reuse tensors when possible
      if (!inputIdsTensor || inputIdsTensor.data.length !== encoded.inputIds.length) {
        inputIdsTensor = new ort.Tensor('int64', encoded.inputIds, [1, encoded.length]);
        attentionMaskTensor = new ort.Tensor('int64', encoded.attentionMask, [1, encoded.length]);
      } else {
        (inputIdsTensor.data as BigInt64Array).set(encoded.inputIds);
        (attentionMaskTensor!.data as BigInt64Array).set(encoded.attentionMask);
      }

      const style = new ort.Tensor('float32', new Float32Array(128).fill(0), [1, 128]);

      // 1. Duration Predictor
      const durationOut = await sessions.durationPredictor!.run({
        input_ids: inputIdsTensor,
        attention_mask: attentionMaskTensor,
        style_dp: style,
      });

      // 2. Text Encoder
      const textOut = await sessions.textEncoder!.run({
        input_ids: inputIdsTensor,
        attention_mask: attentionMaskTensor,
        style_ttl: style,
      });

      // 3. Vector Estimator (simplified)
      const latentLength = encoded.length * 4;
      const latentDim = config?.latent_dim || 80;
      let latents = new Float32Array(latentLength * latentDim).fill(0);

      for (let step = 0; step < 6; step++) {  // Reduced steps for low-end
        const stepTensor = new ort.Tensor('float32', new Float32Array([step / 6]), [1]);
        const vecOut = await sessions.vectorEstimator!.run({
          latents: new ort.Tensor('float32', latents, [1, latentLength, latentDim]),
          text_emb: textOut['last_hidden_state'] || textOut['output'],
          step: stepTensor,
        });
        latents = vecOut['output'].data as any;
      }

      // 4. Vocoder
      const audioOut = await sessions.vocoder!.run({
        latents: new ort.Tensor('float32', latents, [1, latentLength, latentDim]),
      });

      const audioData = audioOut['output'].data as Float32Array;
      const wavBuffer = createWavBuffer(audioData, config?.sample_rate || 24000);

      ctx.postMessage({
        type: 'AUDIO_READY',
        buffer: wavBuffer,
        text,
        latency: performance.now() - start
      }, [wavBuffer]);
    }
  } catch (err: any) {
    console.error('[TTS Worker] Error:', err);
    ctx.postMessage({
      type: 'ERROR',
      message: err.message || 'TTS generation failed'
    });
  }
};
