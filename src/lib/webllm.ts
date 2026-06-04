import * as webllm from "@mlc-ai/web-llm";

const MODEL_ID = "Qwen2-0.5B-Instruct-q4f16_1-MLC";

let _engine: webllm.MLCEngine | null = null;
let _loading = false;
let _lastProgress = 0;

type ProgressCb = (pct: number, text: string) => void;
let _progressCb: ProgressCb | null = null;

export function setWebLLMProgressCallback(cb: ProgressCb) {
  _progressCb = cb;
}

/**
 * Returns true if WebLLM is currently downloading or initializing.
 */
export function isWebLLMLoading(): boolean {
  return _loading;
}

export async function getWebLLMEngine(): Promise<webllm.MLCEngine> {
  if (_engine) return _engine;

  if (_loading) {
    while (_loading) {
      await new Promise((r) => setTimeout(r, 400));
    }
    return _engine!;
  }

  _loading = true;
  _lastProgress = 0;

  try {
    _engine = await webllm.CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (report) => {
        const pct = Math.round(report.progress * 100);

        if (pct !== _lastProgress) {
          _lastProgress = pct;
          _progressCb?.(pct, report.text);

          window.dispatchEvent(
            new CustomEvent("guardian-ai-event", {
              detail: {
                type: "progress",
                payload: { progress: pct, text: report.text },
              },
            })
          );
        }
      },
    });

    window.dispatchEvent(
      new CustomEvent("guardian-ai-event", {
        detail: { type: "ready" },
      })
    );
  } catch (err) {
    window.dispatchEvent(
      new CustomEvent("guardian-ai-event", {
        detail: { type: "error", payload: err },
      })
    );
    throw err;
  } finally {
    _loading = false;
  }

  return _engine!;
}

/**
 * Only call this when you want to start loading the model.
 * Do NOT call on app startup or component mount.
 */
export function preloadWebLLM(onProgress?: ProgressCb) {
  if (onProgress) setWebLLMProgressCallback(onProgress);
  getWebLLMEngine().catch((e) => {
    console.warn("[WebLLM] Preload failed:", e);
  });
}

export function isWebLLMReady(): boolean {
  return _engine !== null;
}

export async function promptWebLLM(
  systemPrompt: string,
  userText: string,
  temperature = 0.7
): Promise<string> {
  try {
    const engine = await getWebLLMEngine();
    const response = await engine.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
      temperature,
    });
    return response.choices[0]?.message?.content ?? "";
  } catch (error: any) {
    console.warn("[WebLLM] Prompt failed, resetting engine:", error);
    _engine = null;
    throw error;
  }
}

