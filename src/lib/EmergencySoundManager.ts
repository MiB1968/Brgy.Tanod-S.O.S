// src/lib/EmergencySoundManager.ts
import { emergencySSML } from "./ssmlTagalog"; // Keep your Tagalog SSML
import { TagalogTTS } from "./TagalogTTS";
import { HybridTTS } from "./HybridTTS";
import { getTagalogMessage, type PhraseKey } from "./tagalogPhrases";

export type EmergencyType = "sos" | "medical" | "fire" | "crime" | "test";

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
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    return this.audioContext;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const ctx = this.getContext();
    if (ctx.state === "suspended") await ctx.resume();

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.currentVolume;

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.createSyntheticReverb(ctx);

    this.masterGain.connect(this.reverb);
    this.reverb.connect(ctx.destination);

    await TagalogTTS.getInstance().initialize();

    this.isInitialized = true;
    console.log("✅ EmergencySoundManager + TTS Initialized");
  }

  private createSyntheticReverb(ctx: AudioContext): AudioBuffer {
    const duration = 2.8;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, 3.2);
      left[i] = (Math.random() * 2 - 1) * env * 0.82;
      right[i] = (Math.random() * 2 - 1) * env * 0.82;
    }
    return buffer;
  }

  async triggerEmergency(
    type: EmergencyType,
    options: {
      speak?: boolean;
      messageKey?: PhraseKey | string;
      volume?: number;
    } = {},
  ) {
    await this.initialize();
    if (options.volume !== undefined) this.setMasterVolume(options.volume);

    this.playAttentionBeep();

    switch (type) {
      case "sos":
        this.startSiren("wail");
        if (options.speak && options.messageKey)
          await this.speak(options.messageKey);
        break;
      case "medical":
        this.startSiren("yelp");
        this.playHeartbeat(18000);
        if (options.speak) await this.speak("medical");
        break;
      case "fire":
        this.startSiren("wail");
        this.playFireEffect();
        if (options.speak) await this.speak("fire");
        break;
      case "crime":
        this.startSiren("wail");
        if (options.speak) await this.speak("crime");
        break;
      case "test":
        this.playTestSequence();
        if (options.speak) await this.speak("test");
        break;
    }
  }

  playAttentionBeep() {
    this.playBeep(1350, 80, 0.75);
  }

  playBeep(freq: number, duration: number, vol: number = 0.6) {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.value = freq;
    gain.gain.value = vol;
    filter.type = "lowpass";
    filter.frequency.value = 2400;

    osc.connect(filter).connect(gain).connect(this.masterGain);
    osc.start();
    setTimeout(() => osc.stop(), duration);
  }

  startSiren(mode: "wail" | "yelp" = "wail") {
    if (this.sirenOsc) this.stopSiren();

    const ctx = this.getContext();
    this.sirenOsc = ctx.createOscillator();
    const gain = ctx.createGain();

    this.sirenOsc.type = "sawtooth";
    this.sirenOsc.frequency.setValueAtTime(650, ctx.currentTime);

    gain.gain.value = 0.65;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    filter.Q.value = 2;

    this.sirenOsc.connect(filter).connect(gain).connect(this.masterGain);

    if (mode === "wail") {
      this.sirenOsc.frequency.linearRampToValueAtTime(
        1250,
        ctx.currentTime + 0.8,
      );
      this.sirenOsc.frequency.linearRampToValueAtTime(
        650,
        ctx.currentTime + 1.8,
      );
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
      setTimeout(
        () => this.playBeep(420 + Math.random() * 300, 280, 0.8),
        i * 420,
      );
    }
  }

  private playTestSequence() {
    this.playBeep(800, 150, 0.6);
    setTimeout(() => this.playBeep(1200, 150, 0.7), 200);
    setTimeout(() => this.playBeep(1600, 300, 0.8), 500);
  }

  private async speak(key: PhraseKey | string) {
    const message =
      typeof key === "string" ? key : getTagalogMessage(key as PhraseKey);
    await HybridTTS.getInstance().speak(message);
  }

  async speakCustom(text: string, options: any = {}) {
    await HybridTTS.getInstance().speak(text, options);
  }

  setMasterVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) this.masterGain.gain.value = this.currentVolume;
  }

  stopAll() {
    this.stopSiren();
    HybridTTS.getInstance().stop();
  }
}

// React Hook
export const useEmergencySound = () => {
  const manager = EmergencySoundManager.getInstance();
  return {
    initialize: () => manager.initialize(),
    triggerEmergency: (type: EmergencyType, opts?: any) =>
      manager.triggerEmergency(type, opts),
    startSiren: (mode?: "wail" | "yelp") => manager.startSiren(mode),
    stopSiren: () => manager.stopSiren(),
    stopAll: () => manager.stopAll(),
    setVolume: (vol: number) => manager.setMasterVolume(vol),
    speakCustom: (text: string, opts?: any) => manager.speakCustom(text, opts),
  };
};
