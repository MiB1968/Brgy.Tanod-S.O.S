/// <reference lib="webworker" />
import { CreateMLCEngine } from "@mlc-ai/web-llm";

let engine: any = null;

// Global error handler for catching async WebGPU device / worker issues compiles
self.onerror = (message, source, lineno, colno, error) => {
  self.postMessage({
    type: 'error',
    payload: error?.message || String(message) || 'WebWorker Unhandled Error'
  });
  return true;
};

self.onunhandledrejection = (event) => {
  self.postMessage({
    type: 'error',
    payload: event.reason?.message || String(event.reason) || 'WebWorker Unhandled Promise Rejection'
  });
};

self.onmessage = async (event) => {
  const { type, payload, messageId } = event.data;

  try {
    if (type === 'init') {
      const modelId = payload?.modelId || "Qwen2-0.5B-Instruct-q4f16_1-MLC";

      engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          self.postMessage({
            type: 'progress',
            payload: { progress: report.progress, text: report.text },
            messageId
          });
        },
      });

      self.postMessage({ type: 'ready', messageId });
    }

    else if (type === 'generate') {
      if (!engine) {
        self.postMessage({ type: 'error', payload: 'Engine not initialized', messageId });
        return;
      }

      let fullResponse = "";
      const chunkSize = payload?.chunkSize || 1; // Default to single token streaming to preserve backward compatibility

      const systemContent = payload?.systemPrompt || "You are Guardian AI, a helpful emergency assistant for Barangay Tanod in the Philippines. Respond in simple Tagalog or English. Be direct, calm, and actionable.";
      const userContent = payload?.prompt || payload?.userMessage || "";

      const reply = await engine.chat.completions.create({
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userContent }
        ],
        stream: true,
        temperature: payload?.temperature || 0.7,
      });

      let buffer = "";
      let tokenCount = 0;

      for await (const chunk of reply) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          buffer += delta;
          tokenCount++;

          if (tokenCount >= chunkSize) {
            self.postMessage({
              type: 'token',
              token: buffer,
              payload: { token: buffer, fullResponse },
              messageId
            });
            buffer = "";
            tokenCount = 0;
          }
        }
      }

      // Flush remaining buffer
      if (buffer) {
        self.postMessage({
          type: 'token',
          token: buffer,
          payload: { token: buffer, fullResponse },
          messageId
        });
      }

      self.postMessage({
        type: 'complete',
        result: fullResponse.trim(),
        payload: { response: fullResponse },
        messageId
      });
    }
  } catch (error: any) {
    self.postMessage({
      type: 'error',
      payload: error.message || 'Unknown error'
    });
  }
};
