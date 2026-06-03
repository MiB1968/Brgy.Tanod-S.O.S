// PATCH: src/server/services/voiceAssistantService.ts
//
// HIGH-03 — No timeout on Gemini API calls. A hanging request would block the
// Socket.io handler indefinitely, leaking a Node.js microtask per connection.
//
// Changes:
//   1. New withTimeout() utility races any promise against a deadline.
//   2. executeWithRetry wraps each attempt in withTimeout (15s default).
//   3. On timeout, the error is classified as transient so retry logic applies.
//
// ── Replace the private executeWithRetry method ─────────────────────────────

  private static readonly GEMINI_TIMEOUT_MS = 15_000; // 15 seconds per attempt

  /**
   * Races a promise against a timeout. Rejects with a TimeoutError on expiry.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(Object.assign(new Error(`[JARVIS] ${label} timed out after ${ms}ms`), {
          code: 'TIMEOUT',
          status: 503, // treated as transient by retry logic
        }));
      }, ms);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = 3,
    delay = 2_000
  ): Promise<T> {
    for (let i = 0; i <= retries; i++) {
      try {
        // Each individual attempt has its own hard deadline
        return await this.withTimeout(
          operation(),
          SecureVoiceAssistantService.GEMINI_TIMEOUT_MS,
          `Gemini call (attempt ${i + 1}/${retries + 1})`
        );
      } catch (err: any) {
        const msg = String(err.message || '');
        const status = err.status ?? 0;
        const isTransient =
          status === 503 ||
          status === 429 ||
          err.code === 'TIMEOUT' ||
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('timed out');

        if (isTransient && i < retries) {
          const backoff = delay * Math.pow(2, i); // exponential: 2s, 4s, 8s
          console.warn(
            `[JARVIS] Transient error (${err.code ?? status}), retrying in ${backoff}ms... ` +
            `(${i + 1}/${retries})`
          );
          await new Promise((res) => setTimeout(res, backoff));
          continue;
        }
        throw err;
      }
    }
    throw new Error('[JARVIS] All retries exhausted');
  }
