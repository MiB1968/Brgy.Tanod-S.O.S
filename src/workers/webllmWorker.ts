/// <reference lib="webworker" />
import { CreateMLCEngine } from "@mlc-ai/web-llm";

let engine: any = null;

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  try {
    if (type === 'init') {
      const modelId = payload.modelId || "Qwen2-0.5B-Instruct-q4f16_1-MLC";

      engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          self.postMessage({
            type: 'progress',
            payload: { progress: report.progress, text: report.text }
          });
        },
      });

      self.postMessage({ type: 'ready' });
    }

    else if (type === 'generate') {
      if (!engine) {
        self.postMessage({ type: 'error', payload: 'Engine not initialized' });
        return;
      }

      let fullResponse = "";

      const reply = await engine.chat.completions.create({
        messages: [
          { role: "system", content: "You are Guardian AI, a helpful emergency assistant for Barangay Tanod in the Philippines. Respond in simple Tagalog or English. Be direct, calm, and actionable." },
          { role: "user", content: payload.prompt }
        ],
        stream: true,
        temperature: 0.7,
      });

      for await (const chunk of reply) {
        const delta = chunk.choices[0]?.delta?.content || "";
        fullResponse += delta;

        self.postMessage({
          type: 'token',
          payload: { token: delta, fullResponse }
        });
      }

      self.postMessage({
        type: 'complete',
        payload: { response: fullResponse }
      });
    }
  } catch (error: any) {
    self.postMessage({
      type: 'error',
      payload: error.message || 'Unknown error'
    });
  }
};
