import { useState, useCallback, useRef } from 'react';

// Simplified shout/loudness detection using Web Audio API
export const useShoutDetection = (onShout: () => void, threshold = -20) => {
  const [isListening, setIsListening] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setIsListening(true);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        const len = dataArray.length;
        for (let i = 0; i < len; i++) {
          sum += dataArray[i];
        }
        const average = sum / len;
        
        // Very basic volume threshold mapping to dB estimation
        // This is heuristic-based and needs tuning
        if (average > 100) { 
            onShout();
        }
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      
      checkVolume();
    } catch (err) {
      console.error('Shout detection error:', err);
    }
  }, [onShout]);

  const stopListening = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening };
};
