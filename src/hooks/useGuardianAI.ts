// src/hooks/useGuardianAI.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioSystem } from './useAudioSystem';
import { guardianAI } from '../services/guardianAI';
import { GuardianContext } from '../types/ai';

export const useGuardianAI = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const { speak, playSiren } = useAudioSystem();
  
  // Ref to hold the speech recognition instance
  const recognitionRef = useRef<any>(null);

  // Stop running recognition cleanly
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('[useGuardianAI] Stop error:', err);
      }
    }
    setIsListening(false);
  }, []);

  const processCommand = useCallback(async (text: string, context?: GuardianContext) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    setTranscript(text);

    try {
      const activeContext: GuardianContext = context || {
        pendingSOS: 0,
        activeTanods: 3,
        isSuperAdmin: true,
      };

      // Query our unified offline-supported Guardian AI service
      const response = await guardianAI.processCommand(text, activeContext);
      
      // Auto-trigger sirens if severe crisis is detected
      if (response.isCrisis || response.reply.toUpperCase().includes('CRITICAL') || response.reply.toUpperCase().includes('EMERGENCY')) {
        playSiren(5000);
      }

      // Voice synthesis response in local Tagalog accent
      speak(response.reply, 'fil-PH');
    } catch (err) {
      console.error('[useGuardianAI] Handled processing error:', err);
      const errReply = "Paumanhin, nagkaroon ng error sa pagkonekta sa command center.";
      speak(errReply, 'fil-PH');
    } finally {
      setIsProcessing(false);
    }
  }, [speak, playSiren]);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      speak("Ang speech-to-text ay hindi suportado sa browser na ito.", "fil-PH");
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    // Clean up existing instance before recreating
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'fil-PH'; // Native Philippine Tagalog
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('[useGuardianAI] Speech recognition error event:', event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const resultsText = event.results[0]?.[0]?.transcript || '';
      if (resultsText) {
        setTranscript(resultsText);
        processCommand(resultsText);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error('[useGuardianAI] Recognition failed to start:', err);
      setIsListening(false);
    }
  }, [isListening, stopListening, processCommand, speak]);

  // Clean layout effects on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  return {
    isListening,
    isProcessing,
    transcript,
    startListening,
    stopListening,
    startVoiceRecognition: startListening, // Keep 100% backwards compatible link for GuardianAssistant.tsx
    processCommand,
  };
};
