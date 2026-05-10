import { useState, useCallback, useRef, useEffect } from 'react';
import { useShoutDetection } from './useShoutDetection';

const KEYWORDS = ["help", "emergency", "danger", "fire", "police"];

export interface GuardianThreat {
  type: 'shout' | 'keyword';
  text: string;
}

export const useGuardianAI = (onThreatDetected: (threat: GuardianThreat) => void) => {
  const [guardianMode, setGuardianMode] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const recognitionRef = useRef<any>(null);
  // Prevent duplicate triggers in a short window
  const lastTriggerRef = useRef<number>(0);

  const handleThreat = useCallback((threat: GuardianThreat) => {
    const now = Date.now();
    // 5 seconds cooldown to prevent spamming
    if (now - lastTriggerRef.current > 5000) {
      lastTriggerRef.current = now;
      onThreatDetected(threat);
    }
  }, [onThreatDetected]);

  const handleShout = useCallback(() => {
    handleThreat({ type: 'shout', text: 'Dynamic AI Alert: High-decibel sound/shout detected.' });
  }, [handleThreat]);

  const { isListening: isShoutListening, startListening: startShout, stopListening: stopShout } = useShoutDetection(handleShout);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
             transcript += event.results[i][0].transcript;
          } else {
             transcript += event.results[i][0].transcript;
          }
        }

        const lowerTranscript = transcript.toLowerCase();
        for (const keyword of KEYWORDS) {
          if (lowerTranscript.includes(keyword)) {
            handleThreat({
              type: 'keyword',
              text: `Guardian AI Distress Keyword Detected: "${transcript.trim()}"`
            });
            break;
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setError(new Error('Microphone permission denied. Guardian AI cannot start.'));
        } else {
          console.error('Guardian AI Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        // Auto-restart if we are still in guardian mode
        if (guardianMode) {
            try {
                recognitionRef.current?.start();
            } catch (e) {
                // Ignore errors if it's already started
            }
        }
      };

      recognitionRef.current = recognition;
    }
  }, [guardianMode, handleThreat]);

  useEffect(() => {
    if (guardianMode) {
      startShout();
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Speech recognition failed to start", e);
      }
    } else {
      stopShout();
      try {
        recognitionRef.current?.stop();
      } catch (e) {
         // Ignore
      }
    }

    return () => {
       stopShout();
       try {
           recognitionRef.current?.stop();
       } catch (e) {}
    }
  }, [guardianMode, startShout, stopShout]);

  return {
    guardianMode,
    setGuardianMode,
    isListening: guardianMode,
    error
  };
};
