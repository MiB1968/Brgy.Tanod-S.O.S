import { useEffect, useRef, useState, useCallback } from 'react';
import { useGuardianStore } from '../store/guardianStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useSOSStore } from '../../../store/useSOSStore';
import { nativeService } from '../../../services/nativeService';
import { guardianAI } from '../../../services/guardianAI';
import { classifyCommand } from '../utils/commandClassifier';
import { sanitizeResponse } from '../utils/safetyFilter';

export const useVoiceGuardian = () => {
  const { state, setState, setTranscript, setResponse, triggerEmergency } = useGuardianStore();
  const { profile: user } = useAuthStore();
  const { createSOS } = useSOSStore();
  
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const speakTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentLangRef = useRef<string>('tl-PH');

  // Unified Speech Synthesis with localized speech voice prioritization
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // Slightly slower for low-end device speakers / elder Tanods
      utterance.pitch = 1.0;

      // Select high-fidelity Tagalog voice if available, fallback to English with polite tone
      const voices = window.speechSynthesis.getVoices();
      const tagalogVoice = voices.find(v => 
        v.lang.includes('tl-PH') || 
        v.lang.includes('fil-PH') || 
        v.lang.includes('tl_PH')
      );

      if (tagalogVoice) {
        utterance.voice = tagalogVoice;
        utterance.lang = tagalogVoice.lang;
      } else {
        // Fallback default voice (best approximation for English synthesizer)
        utterance.lang = 'en-US';
      }

      utterance.onstart = () => {
        setState('RESPONDING');
      };

      utterance.onend = () => {
        setState(useGuardianStore.getState().isEmergency ? 'PROCESSING' : 'LISTENING');
        // Restart speech recognition safely after voice output stops to prevent self-looping
        startListening();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis error:', e);
        setState('LISTENING');
        startListening();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Friction in speech synthesis block:', err);
      setState('IDLE');
    }
  }, [setState]);

  // Clean initialization of Speech Recognition Web API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setState('OFFLINE');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Set continuous to false for clean mobile turn-taking
    recognition.interimResults = true;
    recognition.lang = currentLangRef.current;

    recognition.onstart = () => {
      setState('LISTENING');
    };

    recognition.onresult = (event: any) => {
      const currentResult = event.resultIndex;
      const transcriptText = event.results[currentResult][0].transcript;
      setTranscript(transcriptText);

      if (event.results[currentResult].isFinal) {
        handleFinalTranscript(transcriptText);
      }
    };

    recognition.onerror = (event: any) => {
      // Avoid noise logs for short silence pauses
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[Voice Recognition Error]', event.error);
        setState('ERROR');
      }
    };

    recognition.onend = () => {
      const currentStatus = useGuardianStore.getState().state;
      // Auto-restart if we were listening, but not actively speaking/responding
      if (currentStatus === 'LISTENING') {
        startListening();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }
    };
  }, [setState, setTranscript]);

  const handleFinalTranscript = async (transcript: string) => {
    if (!transcript.trim()) return;

    setState('PROCESSING');
    
    // 1. Classification
    const classification = classifyCommand(transcript);
    
    // 2. Action Handling
    if (classification.type === 'EMERGENCY') {
      triggerEmergency((classification as any).priority || 'HIGH');
      
      const alarmTypeMap: Record<string, 'MEDICAL' | 'FIRE' | 'CRIME' | 'DISTURBANCE' | 'NATURAL_DISASTER' | 'OTHER'> = {
        'sunog': 'FIRE',
        'fire': 'FIRE',
        'saklolo': 'OTHER',
        'tulong': 'OTHER',
        'help': 'OTHER',
        'nasaktan': 'MEDICAL',
        'medical': 'MEDICAL',
        'aksidente': 'MEDICAL',
        'holdap': 'CRIME',
        'barilan': 'CRIME',
        'krimen': 'CRIME'
      };

      let emergencyType: 'MEDICAL' | 'FIRE' | 'CRIME' | 'DISTURBANCE' | 'NATURAL_DISASTER' | 'OTHER' = 'OTHER';
      const lowerT = transcript.toLowerCase();
      
      for (const [kw, mappedType] of Object.entries(alarmTypeMap)) {
        if (lowerT.includes(kw)) {
          emergencyType = mappedType;
          break;
        }
      }

      // Speak reassuring prompt immediately
      const reassuringResponse = "Naka-activate na po ang emergency mode. Ipinapadala ang inyong lokasyon sa Barangay Tanod at sa ating central coordination unit. Manatiling ligtas at kalmado.";
      setResponse(reassuringResponse);
      speak(reassuringResponse);

      // Fetch actual GPS coordinates to ensure accurate dispatch
      try {
        const coordinates = await nativeService.getCurrentPosition();
        await createSOS(
          emergencyType, 
          `Voice activated distress report: "${transcript}"`, 
          coordinates
        );
      } catch (err) {
        console.warn('GPS position timeout or failure. Triggering fallback anonymous location SOS.', err);
        // Fallback default coordinates
        await createSOS(
          emergencyType, 
          `Voice activated distress report: "${transcript}"`, 
          { lat: 14.5995, lng: 120.9842 }
        );
      }
      
    } else if (classification.type === 'LOCAL') {
      const cls = classification as any;
      if (cls.action === 'STOP') {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        setResponse("Tumigil po sa pagsasalita.");
        setState('IDLE');
      } else {
        setResponse(`Local Instruction: ${cls.action}`);
        setState('IDLE');
      }
      
    } else {
      // AI Analysis Mode - Pass directly to beautiful local or server-side agentic model wrapper
      try {
        // Temporary suspension of recognition to avoid hearing self
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }

        const answer = await guardianAI.generateResponse(transcript);
        const filteredResponse = sanitizeResponse(answer);
        
        setResponse(filteredResponse);
        speak(filteredResponse);
      } catch (error) {
        console.error('Failed to analyze voice via local/online guardianAI:', error);
        const offlineAns = "Hindi po makakonekta sa tactical intelligence server. Ngunit huwag mag-alala, naka-save ang inyong ulat sa outbox.";
        setResponse(offlineAns);
        speak(offlineAns);
      }
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        // Suppress "already started" error spam
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Already stopped
      }
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setState('IDLE');
  };

  return {
    isSupported,
    startListening,
    stopListening,
  };
};

