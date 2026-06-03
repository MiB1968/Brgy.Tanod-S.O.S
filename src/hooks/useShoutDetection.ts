import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { micManager } from '../lib/microphoneManager';

// Tactical Distress Detection Hook
// Uses volume peaks + duration + keyword probability (simulated)
export const useShoutDetection = (onShout: (reason: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // States to prevent false positives (like claps)
  const lastPeakTime = useRef<number>(0);
  const peakDuration = useRef<number>(0);
  const isSustainedPeak = useRef<boolean>(false);

  const startListening = useCallback(async () => {
    try {
      // 1. Audio Level Analysis
      const stream = await micManager.acquire('shout-detection', 'useShoutDetection');
      const audioContext = micManager.getAudioContext();
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
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Threshold: 100 for high volume
        if (average > 110) {
          if (peakDuration.current === 0) {
            lastPeakTime.current = Date.now();
          }
          peakDuration.current = Date.now() - lastPeakTime.current;

          // If sound is loud for more than 400ms (to filter out claps/thuds)
          if (peakDuration.current > 400 && !isSustainedPeak.current) {
            isSustainedPeak.current = true;
            onShout("High-decibel distress sound detected.");
          }
        } else {
          // Reset if volume drops
          peakDuration.current = 0;
          isSustainedPeak.current = false;
        }
        
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      
      checkVolume();

      // 2. Keyword Detection (Web Speech API)
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Basic support, can add filters for Tagalog

        recognition.onresult = (event: any) => {
          const keywords = ['help', 'tulong', 'pakiusap', 'tama na', 'wag po', 'save me', 'emergency'];
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript.toLowerCase();
            if (keywords.some(k => transcript.includes(k))) {
              onShout(`Keyword detected: "${transcript.trim()}"`);
              recognition.stop(); // Stop to prevent double triggering
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

    } catch (err: any) {
      console.error('Guardian AI Listener failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error("Guardian AI requires microphone permissions.", { icon: '🚨' });
      }
    }
  }, [onShout]);

  const stopListening = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    micManager.release('shout-detection');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening };
};
