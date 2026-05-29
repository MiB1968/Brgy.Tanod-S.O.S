// src/lib/EmergencySoundManager.ts
import { useAudioStore } from '../store/audioStore';
import { emergencyHaptics } from './haptics';
import { HybridTTS } from './HybridTTS';
import { TagalogTTS } from './TagalogTTS';
import { getTagalogMessage, type PhraseKey } from './tagalogPhrases';
import { EmergencyType } from '../types';

export type LocalEmergencyType = EmergencyType | 'test' | 'sos';

export class EmergencySoundManager {
  private static instance: EmergencySoundManager;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private currentEmergencyType: LocalEmergencyType | null = null;
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
      this.fallbackAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/1004/1004-preview.mp3');
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
  public async playSiren(type: LocalEmergencyType = 'sos') {
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
    this.gainNode.gain.value = volume * 0.95;

    const mainOsc = this.audioContext.createOscillator();
    const lfoOsc = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    const secondOsc = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();

    // Polished siren configuration
    mainOsc.type = 'triangle';
    secondOsc.type = 'sine'; // Sub-bass body
    
    filter.type = 'lowpass';
    filter.frequency.value = 1800;

    const normalizedType = String(type).toLowerCase();

    if (normalizedType === 'medical') {
      // Heartbeat style
      this.playHeartbeat();
      // We don't start the main oscillators for medical
      return;
    } else if (normalizedType === 'fire') {
      mainOsc.frequency.value = 900;
      secondOsc.frequency.value = 450;
      lfoOsc.frequency.value = 4; // Fast Yelp
      lfoGain.gain.value = 200;
    } else {
      // Wailing siren
      mainOsc.frequency.value = 700;
      secondOsc.frequency.value = 350;
      lfoOsc.frequency.value = 0.5; // Slow wail
      lfoGain.gain.value = 400;
    }

    // Connect LFO to Main Oscillator frequency
    lfoOsc.connect(lfoGain);
    lfoGain.connect(mainOsc.frequency);
    lfoGain.connect(secondOsc.frequency);

    // Connect nodes
    mainOsc.connect(filter);
    secondOsc.connect(filter);
    filter.connect(this.gainNode);

    mainOsc.start();
    secondOsc.start();
    lfoOsc.start();

    // Store references to stop them later
    this.audioNodes = { mainOsc, secondOsc, lfoOsc, filter, lfoGain };

    // Haptics
    emergencyHaptics.sirenPulse();
  }

  private audioNodes: any = null;

  private playHeartbeat() {
    // Additional low sine for heartbeat feel
    if (!this.audioContext) return;
    const mainOsc = this.audioContext.createOscillator();
    const lfoOsc = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();

    mainOsc.type = 'sine';
    mainOsc.frequency.value = 55; // Low frequency thud

    lfoOsc.type = 'square';
    lfoOsc.frequency.value = 1.2; // roughly 72 BPM heartbeat

    lfoGain.gain.value = 50; 
    
    lfoOsc.connect(lfoGain);
    lfoGain.connect(mainOsc.frequency);

    mainOsc.connect(this.gainNode!);

    mainOsc.start();
    lfoOsc.start();
    
    this.audioNodes = { mainOsc, lfoOsc, lfoGain };
  }

  public stop() {
    this.isPlaying = false;
    this.isActiveSOS = false;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    if (this.audioNodes) {
      try {
        if (this.audioNodes.mainOsc) this.audioNodes.mainOsc.stop();
        if (this.audioNodes.secondOsc) this.audioNodes.secondOsc.stop();
        if (this.audioNodes.lfoOsc) this.audioNodes.lfoOsc.stop();
      } catch (e) {
         // ignore already stopped errors
      }
      this.audioNodes = null;
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
    type: LocalEmergencyType,
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
    triggerEmergency: (type: LocalEmergencyType, opts?: any) =>
      manager.triggerEmergency(type, opts),
    startSiren: (mode?: "wail" | "yelp") => manager.startSiren(mode),
    stopSiren: () => manager.stopSiren(),
    stopAll: () => manager.stopAll(),
    setVolume: (vol: number) => manager.setMasterVolume(vol),
    speakCustom: (text: string, opts?: any) => manager.speakCustom(text, opts),
  };
};
