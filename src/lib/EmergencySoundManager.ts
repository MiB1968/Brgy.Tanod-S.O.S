// src/lib/EmergencySoundManager.ts
import { useAudioStore } from '../store/audioStore';
import { emergencyHaptics } from './haptics';
import { HybridTTS } from './HybridTTS';
import { TagalogTTS } from './TagalogTTS';
import { getTagalogMessage, type PhraseKey } from './tagalogPhrases';

export type EmergencyType = 'sos' | 'medical' | 'fire' | 'crime' | 'flood' | 'other' | 'test';

export class EmergencySoundManager {
  private static instance: EmergencySoundManager;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private currentEmergencyType: EmergencyType | null = null;
  private fallbackAudio: HTMLAudioElement | null = null;
  private animationFrame: number | null = null;
  private isActiveSOS = false;
  private isInitialized = false;

  private constructor() {
    this.initAudioContext();
    this.initFallbackAudio();
  }

  public static getInstance(): EmergencySoundManager {
    if (!EmergencySoundManager.instance) {
      EmergencySoundManager.instance = new EmergencySoundManager();
    }
    return EmergencySoundManager.instance;
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    } catch (error) {
      console.warn('Web Audio API not supported, using fallback', error);
    }
  }

  private initFallbackAudio() {
    try {
      this.fallbackAudio = new Audio('/sounds/siren-wail.mp3');
      this.fallbackAudio.loop = true;
      this.fallbackAudio.preload = 'auto';
    } catch (e) {
      console.warn('Fallback audio failed to initialize');
    }
  }

  private getMasterVolume(): number {
    return useAudioStore.getState().masterVolume;
  }

  private async ensureAudioContext(): Promise<boolean> {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e) {
        console.warn('Failed to resume AudioContext');
        return false;
      }
    }
    return true;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.ensureAudioContext();
    await TagalogTTS.getInstance().initialize();
    this.isInitialized = true;
    console.log("✅ EmergencySoundManager + TTS Initialized");
  }

  // === PROCEDURAL SIREN ===
  public async playSiren(type: EmergencyType = 'sos') {
    if (this.isPlaying) this.stop();

    const success = await this.ensureAudioContext();
    if (!success || !this.audioContext || !this.gainNode) {
      this.playFallback();
      return;
    }

    this.isPlaying = true;
    this.currentEmergencyType = type;
    this.isActiveSOS = true;

    const volume = this.getMasterVolume();
    this.gainNode.gain.value = volume * 0.9;

    const oscillator = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();

    // Basic siren configuration
    oscillator.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.value = 1350;

    oscillator.frequency.setValueAtTime(520, this.audioContext.currentTime);

    if (type === 'medical') {
      // Heartbeat style
      this.playHeartbeat();
    } else {
      // Wailing siren
      oscillator.frequency.linearRampToValueAtTime(
        1520,
        this.audioContext.currentTime + 1.7
      );
    }

    // Connect nodes
    oscillator.connect(filter);
    filter.connect(this.gainNode);

    oscillator.start();
    this.animationFrame = requestAnimationFrame(() => this.updateSiren(oscillator, filter));

    // Haptics
    if (type === 'medical') emergencyHaptics.heartbeat();
    else emergencyHaptics.sirenPulse();
  }

  private updateSiren(osc: OscillatorNode, filter: BiquadFilterNode) {
    if (!this.isPlaying) return;

    // Modulate frequency for wail effect
    const time = this.audioContext!.currentTime;
    const freq = 520 + Math.sin(time * 3) * 500;
    osc.frequency.setValueAtTime(freq, time);

    this.animationFrame = requestAnimationFrame(() => this.updateSiren(osc, filter));
  }

  private playHeartbeat() {
    // Additional low sine for heartbeat feel
    if (!this.audioContext) return;
    const heartbeatOsc = this.audioContext.createOscillator();
    const heartbeatGain = this.audioContext.createGain();

    heartbeatOsc.type = 'sine';
    heartbeatOsc.frequency.value = 55;
    heartbeatGain.gain.value = this.getMasterVolume() * 0.45;

    heartbeatOsc.connect(heartbeatGain);
    heartbeatGain.connect(this.gainNode!);

    heartbeatOsc.start();
    // Pulse logic can be added with setInterval if needed
  }

  public stop() {
    this.isPlaying = false;
    this.isActiveSOS = false;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    if (this.fallbackAudio) {
      this.fallbackAudio.pause();
      this.fallbackAudio.currentTime = 0;
    }

    console.log('🔴 Emergency audio stopped');
  }

  private playFallback() {
    if (this.fallbackAudio) {
      this.fallbackAudio.play().catch(console.warn);
    }
  }

  // === PUBLIC API ===
  public async triggerEmergency(
    type: EmergencyType,
    options: {
      speak?: boolean;
      messageKey?: PhraseKey | string;
      volume?: number;
    } = {}
  ) {
    if (options.volume !== undefined) this.setMasterVolume(options.volume);
    
    // Volume warning
    if (this.getMasterVolume() > 0.9) {
      console.warn('⚠️ Maximum volume enabled - Siren will be VERY loud');
    }

    this.playAttentionBeep();
    await this.playSiren(type);

    if (options.speak) {
      const message = options.messageKey ? 
        (typeof options.messageKey === 'string' ? options.messageKey : getTagalogMessage(options.messageKey as PhraseKey)) 
        : type;
      await this.speakCustom(message);
    }

    console.log(`🚨 Emergency triggered: ${type}`);
  }

  public setVolume(volume: number) {
    this.setMasterVolume(volume);
  }

  public setMasterVolume(volume: number) {
    useAudioStore.getState().setMasterVolume(volume);
    if (this.gainNode) {
      this.gainNode.gain.value = volume * 0.9;
    }
  }

  public pauseAll() {
    if (this.isActiveSOS) {
      // Keep SOS active but reduce load
      if (this.gainNode) this.gainNode.gain.value *= 0.6;
    } else {
      this.stop();
    }
  }

  public resumeSOS() {
    if (this.isActiveSOS) {
      this.playSiren(this.currentEmergencyType || 'sos');
    }
  }

  public stopAll() {
    this.stop();
    HybridTTS.getInstance().stop();
  }

  public stopSiren() {
    this.stop();
  }

  public startSiren(mode: "wail" | "yelp" = "wail") {
    this.playSiren('sos');
  }

  // Legacy TTS aliases to keep HybridTTS and other things happy
  public playAttentionBeep() {
    this.playBeep(1350, 80, 0.75);
  }

  public playBeep(freq: number, duration: number, vol: number = 0.6) {
    if (!this.audioContext || !this.gainNode) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.value = freq;
    gain.gain.value = vol * this.getMasterVolume();
    filter.type = "lowpass";
    filter.frequency.value = 2400;

    osc.connect(filter).connect(gain).connect(this.gainNode);
    osc.start();
    setTimeout(() => osc.stop(), duration);
  }

  public async speakCustom(text: string, options: any = {}) {
    await HybridTTS.getInstance().speak(text, options);
  }
}

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
