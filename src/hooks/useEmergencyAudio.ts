// src/hooks/useEmergencyAudio.ts
import { useRef, useCallback } from 'react';

export type EmergencyType = 'sos' | 'medical' | 'fire' | 'crime';

export const useEmergencyAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sirenOscRef = useRef<OscillatorNode | null>(null);
  const sirenLfoRef = useRef<OscillatorNode | null>(null);
  const reverbRef = useRef<ConvolverNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const isInitializedRef = useRef(false);

  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Load Reverb (Procedural)
  const initAudio = useCallback(async () => {
    if (isInitializedRef.current) return;
    
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    const reverb = ctx.createConvolver();
    const masterGain = ctx.createGain();
    
    masterGain.gain.value = 0.85;
    masterGainRef.current = masterGain;

    // Create impulse response
    const length = ctx.sampleRate * 3;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 4);
      left[i] = (Math.random() * 2 - 1) * decay * 0.7;
      right[i] = (Math.random() * 2 - 1) * decay * 0.7;
    }

    reverb.buffer = impulse;
    reverbRef.current = reverb;
    isInitializedRef.current = true;
  }, [getContext]);

  // Heartbeat Sound (Medical Emergency)
  const playHeartbeat = useCallback(async (duration = 8000) => {
    await initAudio();
    const ctx = getContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = 55;
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    gain.gain.value = 0.45;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();

    // Pulsing heartbeat
    let beatCount = 0;
    const interval = setInterval(() => {
      gain.gain.setValueAtTime(0.45, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.25);
      beatCount++;
      if (beatCount > 20) clearInterval(interval);
    }, 380);

    setTimeout(() => osc.stop(), duration);
  }, [initAudio]);

  // Siren with Reverb + Spatial Audio (Continuous realistic synthesized wail)
  const startSiren = useCallback(async (type: 'wail' | 'yelp' = 'wail', pan = 0) => {
    await initAudio();
    const ctx = getContext();

    // Clean up any existing siren first to prevent duplicates
    if (sirenOscRef.current) {
      try {
        sirenOscRef.current.stop();
        sirenOscRef.current.disconnect();
      } catch (e) {}
    }
    if (sirenLfoRef.current) {
      try {
        sirenLfoRef.current.stop();
        sirenLfoRef.current.disconnect();
      } catch (e) {}
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const panner = ctx.createStereoPanner();

    panner.pan.value = pan; // -1 (left) to +1 (right)

    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.value = 1350;
    gain.gain.value = 0.55;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);

    if (reverbRef.current) {
      const wet = ctx.createGain();
      wet.gain.value = 0.38;
      gain.connect(reverbRef.current);
      reverbRef.current.connect(wet);
      wet.connect(ctx.destination);
    }

    sirenOscRef.current = osc;

    // Continuous wailing using LFO (Low-Frequency Oscillator) to modulate pitch
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    if (type === 'wail') {
      lfo.type = 'sine';
      lfo.frequency.value = 0.35; // 0.35 Hz (peaks once every ~3 seconds)
      lfoGain.gain.value = 450;    // pitch swings +/- 450 Hz
      osc.frequency.setValueAtTime(800, ctx.currentTime); // Base 800 Hz => Range [350 Hz to 1250 Hz]
    } else {
      // Yelp (faster siren cycle)
      lfo.type = 'sine';
      lfo.frequency.value = 2.4;  // 2.4 Hz (much faster pulsation)
      lfoGain.gain.value = 280;   // pitch swings +/- 280 Hz
      osc.frequency.setValueAtTime(950, ctx.currentTime); // Base 950 Hz => Range [670 Hz to 1230 Hz]
    }

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    lfo.start();
    sirenLfoRef.current = lfo;

    osc.start();
  }, [initAudio, getContext]);

  const stopSiren = useCallback(() => {
    if (sirenOscRef.current) {
      try {
        sirenOscRef.current.stop();
        sirenOscRef.current.disconnect();
      } catch (e) {}
      sirenOscRef.current = null;
    }
    if (sirenLfoRef.current) {
      try {
        sirenLfoRef.current.stop();
        sirenLfoRef.current.disconnect();
      } catch (e) {}
      sirenLfoRef.current = null;
    }
  }, []);

  const playBeep = useCallback((freq = 900, duration = 150, volume = 0.5, pan = 0) => {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();

    panner.pan.value = pan;
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  }, [getContext]);

  const stopAll = useCallback(() => {
    stopSiren();
  }, [stopSiren]);

  return {
    initAudio,
    startSiren,
    stopSiren,
    playHeartbeat,
    playBeep,
    stopAll,
  };
};
