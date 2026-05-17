import * as ort from 'onnxruntime-web';

// Required for browser WASM fallback
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;
ort.env.logLevel = 'error';

let sessions: {
  durationPredictor: ort.InferenceSession | null;
  textEncoder: ort.InferenceSession | null;
  vectorEstimator: ort.InferenceSession | null;
  vocoder: ort.InferenceSession | null;
} = { durationPredictor: null, textEncoder: null, vectorEstimator: null, vocoder: null };

let unicodeIndexer: Map<string, number> = new Map();
let config: any = null;

async function loadConfigAndIndexer(basePath = '/models/supertonic') {
  if (config && unicodeIndexer.size > 0) return;
  try {
    const [configRes, indexerRes] = await Promise.all([
      fetch(`${basePath}/tts.json`).then(r => r.json()).catch(() => ({ LATENT_DIM: 128, SAMPLE_RATE: 24000 })),
      fetch(`${basePath}/unicode_indexer.json`).then(r => r.json()).catch(() => ({}))
    ]);
    config = configRes;
    unicodeIndexer = new Map(Object.entries(indexerRes).map(([k, v]) => [k, Number(v)]));
  } catch (err) {
    console.warn("Could not load config and indexer. Falling back to defaults.");
    config = { LATENT_DIM: 128, SAMPLE_RATE: 24000 };
  }
}

async function initSessions(basePath = '/models/supertonic') {
  if (sessions.textEncoder) return;

  const isLowMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4;
  const opts: ort.InferenceSession.SessionOptions = {
    graphOptimizationLevel: 'all',
    executionProviders: ['webgpu', 'wasm'],
    intraOpNumThreads: isLowMemory ? 1 : Math.min(2, navigator.hardwareConcurrency || 2),
    interOpNumThreads: 1,
    enableMemPattern: true,
    enableCpuMemArena: !isLowMemory,
  };

  try {
    sessions.durationPredictor = await ort.InferenceSession.create(`${basePath}/duration_predictor.onnx`, opts);
    sessions.textEncoder = await ort.InferenceSession.create(`${basePath}/text_encoder.onnx`, opts);
    sessions.vectorEstimator = await ort.InferenceSession.create(`${basePath}/vector_estimator.onnx`, opts);
    sessions.vocoder = await ort.InferenceSession.create(`${basePath}/vocoder.onnx`, opts);
    console.log('[TTS Worker] All Supertonic sessions loaded successfully');
  } catch (err) {
    console.warn('[TTS Worker] WebGPU failed, falling back to WASM', err);
    opts.executionProviders = ['wasm'];
    sessions.durationPredictor = await ort.InferenceSession.create(`${basePath}/duration_predictor.onnx`, opts);
    sessions.textEncoder = await ort.InferenceSession.create(`${basePath}/text_encoder.onnx`, opts);
    sessions.vectorEstimator = await ort.InferenceSession.create(`${basePath}/vector_estimator.onnx`, opts);
    sessions.vocoder = await ort.InferenceSession.create(`${basePath}/vocoder.onnx`, opts);
    console.log('[TTS Worker] All Supertonic sessions loaded successfully using WASM');
  }
}

function encodeText(text: string, lang: string = 'tl'): { inputIds: BigInt64Array; attentionMask: BigInt64Array; length: number } {
  const normalized = text
    .toLowerCase()
    .replace(/ñ/g, 'ny')
    .replace(/ü/g, 'u')
    .trim();

  const tagged = `<${lang}>${normalized}</${lang}>`;
  const chars = Array.from(tagged);
  const inputIds: bigint[] = [];
  const attentionMask: bigint[] = [];

  for (const char of chars) {
    const idx = unicodeIndexer.get(char) ?? unicodeIndexer.get(' ') ?? 0;
    inputIds.push(BigInt(idx));
    attentionMask.push(1n);
  }

  return {
    inputIds: new BigInt64Array(inputIds),
    attentionMask: new BigInt64Array(attentionMask),
    length: inputIds.length
  };
}

self.onmessage = async (e: MessageEvent) => {
  const { text, voicePreset, lowMemory } = e.data;
  if (!text) return;

  const type = e.data.type || 'SPEAK';
  const lang = voicePreset === 'default' ? 'en' : 'tl';

  try {
    if (type === 'INIT') {
      await loadConfigAndIndexer();
      await initSessions();
      self.postMessage({ type: 'ready' });
      return;
    }

    if (type === 'SPEAK') {
      await loadConfigAndIndexer();
      await initSessions();
      
      const startMemory = (performance as any).memory?.usedJSHeapSize;
      const startTime = performance.now();

      const encoded = encodeText(text, lang);

      // === 1. Duration Predictor ===
      const durationFeeds = {
        input_ids: new ort.Tensor('int64', encoded.inputIds, [1, encoded.length]),
        attention_mask: new ort.Tensor('int64', encoded.attentionMask, [1, encoded.length]),
        style_dp: new ort.Tensor('float32', new Float32Array(128).fill(0), [1, 128]) // placeholder
      };
      // const durationOut = await sessions.durationPredictor!.run(durationFeeds);
      // const rawDurations = durationOut['output'].data as Float32Array; // adjust key

      // === 2. Text Encoder ===
      const textFeeds = {
        input_ids: new ort.Tensor('int64', encoded.inputIds, [1, encoded.length]),
        attention_mask: new ort.Tensor('int64', encoded.attentionMask, [1, encoded.length]),
        style_ttl: new ort.Tensor('float32', new Float32Array(128).fill(0), [1, 128]) // placeholder
      };
      // const textOut = await sessions.textEncoder!.run(textFeeds);

      // === 3. Vector Estimator ===
      // let latents = new Float32Array(config.LATENT_DIM * ...);
      // for (let step = 0; step < 8; step++) { ... }

      // === 4. Vocoder ===
      // const vocoderFeeds = { latents: new ort.Tensor('float32', latents, [1, shape]) };
      // const audioOut = await sessions.vocoder!.run(vocoderFeeds);
      // const audioData = audioOut['output'].data as Float32Array;
      
      // Mock an audio buffer generation since the exact models aren't present locally to run
      const audioData = new Float32Array(config.SAMPLE_RATE); // 1 second mock

      const wavBuffer = createWavBuffer(audioData, config.SAMPLE_RATE || 24000);
      
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize;
      
      console.log(`[TTS Worker Telemetry] Latency: ${(endTime - startTime).toFixed(2)}ms, Memory Delta: ${((endMemory - startMemory) / 1024 / 1024).toFixed(2)}MB`);

      self.postMessage({ type: 'audio', pcm: wavBuffer }, [wavBuffer]);
    }
  } catch (err: any) {
    self.postMessage({ type: 'error', error: err.message, stack: err.stack });
  }
};

function createWavBuffer(audioData: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bufferLength = 44 + audioData.length * 2;
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  // WAV Header (standard)
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + audioData.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, audioData.length * 2, true);

  // Convert float32 [-1..1] to int16
  let offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    const s = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  return buffer;
}

