// src/lib/EmergencySoundManager.ts
import { getTagalogMessage, type PhraseKey } from './tagalogPhrases';
import { emergencySSML } from './ssmlTagalog';

export type EmergencyType = 'sos' | 'medical' | 'fire' | 'crime' | 'test';

export class EmergencySoundManager {
  private audioContext: AudioContext | null = null;
  private reverb: ConvolverNode | null = null;
  private masterGain: GainNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private isInitialized = false;

  private static instance: EmergencySoundManager;

  static getInstance(): EmergencySoundManager {
    if (!EmergencySoundManager.instance) {
      EmergencySoundManager.instance = new EmergencySoundManager();
    }
    return EmergencySoundManager.instance;
  }

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const ctx = this.getContext();
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.9;

    // Create high-quality reverb
    this.reverb = ctx.createConvolver();
    const length = ctx.sampleRate * 3.2;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 3.5);
      left[i] = (Math.random() * 2 - 1) * decay * 0.75;
      right[i] = (Math.random() * 2 - 1) * decay * 0.75;
    }

    this.reverb.buffer = impulse;
    this.isInitialized = true;
  }

  // ==================== CORE SOUNDS ====================

  async playBeep(freq: number = 900, duration: number = 150, volume: number = 0.5) {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  }

  async startSiren(type: 'wail' | 'yelp' = 'wail') {
    await this.initialize();
    const ctx = this.getContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const panner = ctx.createStereoPanner();

    panner.pan.value = 0.2;

    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.value = 1350;
    gain.gain.value = 0.58;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);

    // Add reverb
    if (this.reverb) {
      const wet = ctx.createGain();
      wet.gain.value = 0.42;
      gain.connect(this.reverb);
      this.reverb.connect(wet);
      wet.connect(ctx.destination);
    }

    this.sirenOsc = osc;

    if (type === 'wail') {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1520, ctx.currentTime + 1.8);
    } else {
      osc.frequency.value = 980;
    }

    osc.start();
  }

  stopSiren() {
    if (this.sirenOsc) {
      const ctx = this.getContext();
      this.sirenOsc.stop(ctx.currentTime + 1.2);
      this.sirenOsc = null;
    }
  }

  async playHeartbeat(durationMs: number = 10000) {
    await this.initialize();
    const ctx = this.getContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = 58;
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    gain.gain.value = 0.4;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();

    let count = 0;
    const interval = setInterval(() => {
      gain.gain.setValueAtTime(0.45, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.28);
      count++;
      if (count > 25) clearInterval(interval);
    }, 420);

    setTimeout(() => osc.stop(), durationMs);
  }

  // ==================== HIGH-LEVEL EMERGENCY METHODS ====================

  async triggerEmergency(type: EmergencyType, options: { useSiren?: boolean; speakMessage?: boolean } = {}) {
    const { useSiren = true, speakMessage = true } = options;

    await this.initialize();

    // Initial sharp beep
    this.playBeep(1350, 120, 0.6);

    switch (type) {
      case 'sos':
        if (useSiren) this.startSiren('wail');
        if (speakMessage) {
          // You can pass speak function from useTTS if needed
          console.log('🔊 Playing SOS Tagalog message...');
        }
        break;

      case 'medical':
        if (useSiren) this.startSiren('yelp');
        this.playHeartbeat(15000);
        break;

      case 'fire':
        if (useSiren) this.startSiren('wail');
        this.playBeep(680, 400, 0.7);
        setTimeout(() => this.playBeep(680, 400, 0.7), 600);
        break;

      case 'crime':
        if (useSiren) this.startSiren('wail');
        break;

      case 'test':
        this.playBeep(900, 200, 0.5);
        setTimeout(() => this.playBeep(1200, 200, 0.5), 300);
        break;
    }
  }

  stopAll() {
    this.stopSiren();
  }

  setMasterVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}

// ==================== React Hook Wrapper ====================
export const useEmergencySound = () => {
  const manager = EmergencySoundManager.getInstance();

  return {
    initialize: () => manager.initialize(),
    triggerEmergency: (type: EmergencyType, options?: any) => manager.triggerEmergency(type, options),
    startSiren: (type?: 'wail' | 'yelp') => manager.startSiren(type),
    stopSiren: () => manager.stopSiren(),
    playHeartbeat: (duration?: number) => manager.playHeartbeat(duration),
    playBeep: (freq?: number, duration?: number, volume?: number) => manager.playBeep(freq, duration, volume),
    stopAll: () => manager.stopAll(),
  };
};
