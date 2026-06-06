import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { micManager } from '../lib/microphoneManager';

// Tactical Distress Detection Hook
// Uses volume peaks + duration + keyword probability (simulated)
export const useShoutDetection = (onShout: (reason: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // States to prevent false positives (like claps)
  const lastPeakTime = useRef<number>(0);
  const peakDuration = useRef<number>(0);
  const isSustainedPeak = useRef<boolean>(false);

  const startListening = useCallback(async () => {
    if (isListeningRef.current) return;
    isListeningRef.current = true;
    setIsListening(true);

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
      sourceRef.current = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!isListeningRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        // Threshold: 110 for high volume
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
        recognition.lang = 'fil-PH'; // Tagalog/Filipino language engine localization

        recognition.onresult = (event: any) => {
          const keywords = ['help', 'tulong', 'pakiusap', 'tama na', 'wag po', 'save me', 'emergency'];
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript.toLowerCase();
            if (keywords.some(k => transcript.includes(k))) {
              onShout(`Keyword detected: "${transcript.trim()}"`);
              recognition.stop(); // Stop to prevent double triggering (which triggers onend to restart)
            }
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'language-not-supported' || event.error === 'language-unavailable') {
            console.warn(`Speech recognition language ${recognition.lang} not supported. Falling back to en-US.`);
            recognition.lang = 'en-US';
          } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            console.error('Speech recognition permission or service not allowed:', event.error);
            stopListening();
            toast.error("Guardian AI microphone access was revoked or unavailable.", { icon: '🚨' });
          } else {
            console.warn('Speech recognition error:', event.error);
          }
        };

        recognition.onend = () => {
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch (e) {
              console.warn('Speech recognition auto-restart failed:', e);
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

    } catch (err: any) {
      console.error('Guardian AI Listener failed:', err);
      isListeningRef.current = false;
      setIsListening(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error("Guardian AI requires microphone permissions.", { icon: '🚨' });
      }
    }
  }, [onShout]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (e) {
        console.warn('Failed to disconnect source node:', e);
      }
      sourceRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (e) {
        console.warn('Failed to disconnect analyser node:', e);
      }
      analyserRef.current = null;
    }

    micManager.release('shout-detection');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null; // Clean up handler to prevent restart loop
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  }, []);

  return { isListening, startListening, stopListening };
};
