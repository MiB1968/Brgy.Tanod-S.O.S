// src/lib/EmergencySoundManager.ts
import { emergencySSML } from './ssmlTagalog'; // Keep your Tagalog SSML

export type EmergencyType = 'sos' | 'medical' | 'fire' | 'crime' | 'test';

export class EmergencySoundManager {
  private static instance: EmergencySoundManager;
  private audioContext: AudioContext | null = null;
  private masterGain!: GainNode;
  private reverb!: ConvolverNode;
  private sirenOsc: OscillatorNode | null = null;
  private isInitialized = false;
  private currentVolume = 0.85;

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
    if (ctx.state === 'suspended') await ctx.resume();

    // Master Volume
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.currentVolume;

    // High-quality Procedural Reverb (no external files!)
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.createSyntheticReverb(ctx, 2.8, 3.2);

    this.masterGain.connect(this.reverb);
    this.reverb.connect(ctx.destination);

    this.isInitialized = true;
    console.log('✅ EmergencySoundManager Initialized with Reverb');
  }

  private createSyntheticReverb(ctx: AudioContext, duration: number = 2.8, decay: number = 3.2): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, decay);
      left[i] = (Math.random() * 2 - 1) * env * 0.85;
      right[i] = (Math.random() * 2 - 1) * env * 0.85;
    }
    return buffer;
  }

  async triggerEmergency(type: EmergencyType, options: { speak?: boolean; messageKey?: string; volume?: number } = {}) {
    await this.initialize();

    const vol = options.volume ?? this.currentVolume;
    this.setMasterVolume(vol);

    // Quick attention beep
    this.playBeep(1350, 80, 0.7);

    switch (type) {
      case 'sos':
        this.startSiren('wail');
        if (options.speak && options.messageKey) {
          this.speakTagalog(options.messageKey);
        }
        break;

      case 'medical':
        this.startSiren('yelp');
        this.playHeartbeat(18000);
        break;

      case 'fire':
        this.startSiren('wail');
        this.playFireEffect();
        break;

      case 'crime':
        this.startSiren('wail');
        break;

      case 'test':
        this.playTestSequence();
        break;
    }
  }

  private playBeep(freq: number, duration: number, volume: number = 0.6) {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.value = volume;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;

    osc.connect(filter).connect(gain).connect(this.masterGain);

    osc.start();
    setTimeout(() => osc.stop(), duration);
  }

  startSiren(mode: 'wail' | 'yelp' = 'wail') {
    if (this.sirenOsc) this.stopSiren();

    const ctx = this.getContext();
    this.sirenOsc = ctx.createOscillator();
    const gain = ctx.createGain();

    this.sirenOsc.type = 'sawtooth';
    this.sirenOsc.frequency.setValueAtTime(650, ctx.currentTime);

    gain.gain.value = 0.65;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 2;

    this.sirenOsc.connect(filter).connect(gain).connect(this.masterGain);

    if (mode === 'wail') {
      this.sirenOsc.frequency.linearRampToValueAtTime(1250, ctx.currentTime + 0.8);
      this.sirenOsc.frequency.linearRampToValueAtTime(650, ctx.currentTime + 1.8);
    } else {
      this.sirenOsc.frequency.setValueAtTime(1250, ctx.currentTime);
    }

    this.sirenOsc.start();
  }

  stopSiren() {
    if (this.sirenOsc) {
      this.sirenOsc.stop();
      this.sirenOsc = null;
    }
  }

  private playHeartbeat(durationMs: number = 18000) {
    const interval = setInterval(() => {
      this.playBeep(180, 40, 0.9);
      setTimeout(() => this.playBeep(180, 60, 0.7), 180);
    }, 680);

    setTimeout(() => clearInterval(interval), durationMs);
  }

  private playFireEffect() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => this.playBeep(420 + Math.random() * 300, 280, 0.8), i * 420);
    }
  }

  private playTestSequence() {
    this.playBeep(800, 150, 0.6);
    setTimeout(() => this.playBeep(1200, 150, 0.7), 200);
    setTimeout(() => this.playBeep(1600, 300, 0.8), 500);
  }

  private async speakTagalog(key: string) {
    try {
      // Use your existing Google TTS or Web Speech API fallback
      const utterance = new SpeechSynthesisUtterance(key);
      utterance.lang = 'tl-PH';
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS fallback failed', e);
    }
  }

  setMasterVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) this.masterGain.gain.value = this.currentVolume;
  }

  stopAll() {
    this.stopSiren();
  }
}

// React Hook
export const useEmergencySound = () => {
  const manager = EmergencySoundManager.getInstance();
  return {
    initialize: () => manager.initialize(),
    triggerEmergency: (type: EmergencyType, opts?: any) => manager.triggerEmergency(type, opts),
    startSiren: (mode?: 'wail' | 'yelp') => manager.startSiren(mode),
    stopSiren: () => manager.stopSiren(),
    stopAll: () => manager.stopAll(),
    setVolume: (vol: number) => manager.setMasterVolume(vol),
  };
};
