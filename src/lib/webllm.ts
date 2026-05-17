import * as webllm from "@mlc-ai/web-llm";

const MODEL_ID = "Qwen2-0.5B-Instruct-q4f16_1-MLC";

let _engine: webllm.MLCEngine | null = null;
let _loading = false;

type ProgressCb = (pct: number, text: string) => void;
let _progressCb: ProgressCb | null = null;

export function setWebLLMProgressCallback(cb: ProgressCb) {
  _progressCb = cb;
}

export async function getWebLLMEngine(): Promise<webllm.MLCEngine> {
  if (_engine) return _engine;

  if (_loading) {
    while (_loading) await new Promise((r) => setTimeout(r, 300));
    return _engine!;
  }

  _loading = true;
  try {
    _engine = await webllm.CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (report) => {
        const pct = Math.round(report.progress * 100);
        _progressCb?.(pct, report.text);
      },
    });
  } finally {
    _loading = false;
  }
  return _engine!;
}

export function preloadWebLLM(onProgress?: ProgressCb) {
  if (onProgress) setWebLLMProgressCallback(onProgress);
  getWebLLMEngine().catch((e) =>
    console.warn("[WebLLM] Preload failed:", e)
  );
}

export function isWebLLMReady(): boolean {
  return _engine !== null;
}

export async function promptWebLLM(systemPrompt: string, userText: string, temperature = 0.7): Promise<string> {
  const engine = await getWebLLMEngine();
  const response = await engine.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ],
    temperature,
  });
  return response.choices[0]?.message?.content ?? "";
}
