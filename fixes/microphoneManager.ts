// NEW FILE: src/lib/microphoneManager.ts
//
// HIGH-04 — Three components each called navigator.mediaDevices.getUserMedia()
// independently (GuardianVoiceAssistant, VoiceBiometricModal, useShoutDetection).
// Simultaneous activation opens 3 hardware streams, triggers permission prompts
// for each, and causes audio feedback / conflict on single-mic devices.
//
// This singleton:
//   • Opens the mic ONCE and reference-counts consumers.
//   • Exposes an AudioContext and shared MediaStream for all consumers.
//   • Releases the hardware track only when the last consumer calls release().
//   • Prevents consumers from accidentally stopping tracks they don't own.

export type MicConsumerId = string;

interface MicConsumer {
  id: MicConsumerId;
  label: string;
  acquiredAt: number;
}

class MicrophoneManager {
  private static _instance: MicrophoneManager | null = null;

  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private consumers: Map<MicConsumerId, MicConsumer> = new Map();
  private acquirePromise: Promise<MediaStream> | null = null;

  private constructor() {}

  static getInstance(): MicrophoneManager {
    if (!MicrophoneManager._instance) {
      MicrophoneManager._instance = new MicrophoneManager();
    }
    return MicrophoneManager._instance;
  }

  /**
   * Acquire a reference to the shared mic stream.
   * Safe to call concurrently — only one getUserMedia() is ever in flight.
   *
   * @param consumerId  Stable ID for this consumer (e.g. 'guardian-voice', 'shout-detection')
   * @param label       Human-readable label for debugging
   */
  async acquire(consumerId: MicConsumerId, label: string): Promise<MediaStream> {
    // Register consumer first (idempotent)
    this.consumers.set(consumerId, { id: consumerId, label, acquiredAt: Date.now() });

    // Fast path: stream already open and all tracks live
    if (this.stream && this.stream.getTracks().every((t) => t.readyState === 'live')) {
      console.debug(`[Mic] ${label} reused existing stream (${this.consumers.size} consumers)`);
      return this.stream;
    }

    // Coalesce concurrent acquire() calls into one getUserMedia promise
    if (!this.acquirePromise) {
      this.acquirePromise = navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then((s) => {
          this.stream = s;
          console.debug(`[Mic] Hardware stream opened (consumers: ${this.consumers.size})`);
          return s;
        })
        .finally(() => {
          this.acquirePromise = null;
        });
    }

    return this.acquirePromise;
  }

  /**
   * Returns a lazily-created AudioContext tied to the shared stream.
   * Calling code should NOT create its own AudioContext.
   */
  getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      // Resume silently — triggered by user gesture upstream
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  /**
   * Release this consumer's reference.
   * When the last consumer releases, the hardware track is stopped.
   *
   * @param consumerId  Must match the id passed to acquire()
   */
  release(consumerId: MicConsumerId): void {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      console.warn(`[Mic] release() called for unknown consumer "${consumerId}" — no-op`);
      return;
    }

    this.consumers.delete(consumerId);
    console.debug(`[Mic] ${consumer.label} released (${this.consumers.size} remaining)`);

    if (this.consumers.size === 0) {
      this._stopHardware();
    }
  }

  /**
   * Force-release all consumers and stop hardware (e.g. on logout).
   */
  forceReleaseAll(): void {
    const labels = Array.from(this.consumers.values()).map((c) => c.label);
    console.warn(`[Mic] Force-releasing all consumers: ${labels.join(', ')}`);
    this.consumers.clear();
    this._stopHardware();
  }

  get activeConsumers(): MicConsumer[] {
    return Array.from(this.consumers.values());
  }

  get hasStream(): boolean {
    return !!this.stream && this.stream.getTracks().some((t) => t.readyState === 'live');
  }

  private _stopHardware(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
      console.debug('[Mic] Hardware stream closed');
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}

/** Singleton export */
export const micManager = MicrophoneManager.getInstance();

// ── Migration guide for each consumer ───────────────────────────────────────
//
// 1. src/components/ai/GuardianVoiceAssistant.tsx (line 65)
//    BEFORE:
//      navigator.mediaDevices.getUserMedia({ audio: true })
//        .then(stream => { ... })
//    AFTER:
//      micManager.acquire('guardian-voice', 'GuardianVoiceAssistant')
//        .then(stream => { ... })
//    On component unmount:
//      micManager.release('guardian-voice');
//
// 2. src/components/Admin/VoiceBiometricModal.tsx (line 23)
//    BEFORE:
//      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//    AFTER:
//      const stream = await micManager.acquire('biometric-modal', 'VoiceBiometricModal');
//    On modal close/unmount:
//      micManager.release('biometric-modal');
//
// 3. src/hooks/useShoutDetection.ts (line 21)
//    BEFORE:
//      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//    AFTER:
//      const stream = await micManager.acquire('shout-detection', 'useShoutDetection');
//    In the cleanup return:
//      return () => { micManager.release('shout-detection'); };
//
// NOTE: Do NOT call stream.getTracks().forEach(t => t.stop()) in consumer code.
// Use micManager.release() instead so other consumers are not affected.
