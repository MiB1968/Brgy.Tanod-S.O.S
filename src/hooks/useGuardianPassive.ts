import { useState, useEffect, useRef, useCallback } from 'react';
import * as GuardianAudioService from '../services/guardianAudioService';
import { useSOSStore } from '../store/useSOSStore';
import { useAuthStore } from '../store/useAuthStore';
import { EmergencyType } from '../types';

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface UseGuardianPassiveReturn {
  isPassiveActive: boolean;
  lastTriggerPhrase: string | null;
  isRecording: boolean;
  recordingDuration: number;
}

// ==================== LEVENSHTEIN DISTANCE ====================
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// ==================== TRIGGER DETECTION ====================
const SINGLE_WORD_TRIGGERS = ['tulong', 'huwag'];
const PHRASE_TRIGGERS = ['tama na', 'para ng awa', 'paranag awa tulong', 'tulungan mo ako'];

function isTriggerPhrase(transcript: string): { matched: boolean; phrase: string | null } {
  const normalized = transcript.toLowerCase().trim();

  // Layer 1: Exact substring match
  for (const trigger of PHRASE_TRIGGERS) {
    if (normalized.includes(trigger)) {
      return { matched: true, phrase: trigger };
    }
  }

  // Layer 2: Levenshtein ≤ 2 for single-word triggers (handles mumbled speech)
  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    for (const trigger of SINGLE_WORD_TRIGGERS) {
      if (levenshteinDistance(word, trigger) <= 2) {
        return { matched: true, phrase: trigger };
      }
    }
  }
  return { matched: false, phrase: null };
}

// ==================== MAIN HOOK ====================
export function useGuardianPassive(
  guardianMode: boolean,
  onInitiateSOS?: (type: EmergencyType, description: string) => void
): UseGuardianPassiveReturn {
  const [isPassiveActive, setIsPassiveActive] = useState(false);
  const [lastTriggerPhrase, setLastTriggerPhrase] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const recognitionRef = useRef<any>(null);
  const shouldBeListening = useRef(false);
  const lastTriggerTime = useRef(0);
  const lastKnownPosition = useRef<Location | null>(null);
  const geoWatchId = useRef<number | null>(null);
  const durationInterval = useRef<number | null>(null);

  const createSOS = useSOSStore((state: any) => state.createSOS);
  const profile = useAuthStore((state: any) => state.profile);

  // ==================== GPS WATCH ====================
  const startGeoWatch = useCallback(() => {
    if (!('geolocation' in navigator) || geoWatchId.current !== null) return;

    geoWatchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastKnownPosition.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
      },
      (err) => console.warn('[GuardianPassive] watchPosition error', err),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
  }, []);

  const stopGeoWatch = useCallback(() => {
    if (geoWatchId.current !== null) {
      navigator.geolocation.clearWatch(geoWatchId.current);
      geoWatchId.current = null;
    }
  }, []);

  // ==================== TRIGGER SOS ====================
  const triggerSOS = useCallback(async (phrase: string) => {
    const description = `AI Guardian: Distress keyword detected — "${phrase}"`;
    const location = lastKnownPosition.current || { lat: 14.409, lng: 120.94 };

    // Correct positional signature for your createSOS
    const alertId = await createSOS(
      'CRIME',
      description,
      { lat: location.lat, lng: location.lng },
      [],
      crypto.randomUUID()
    );

    // Start recording
    setIsRecording(true);
    setRecordingDuration(0);

    if (durationInterval.current) clearInterval(durationInterval.current);
    durationInterval.current = window.setInterval(() => {
      setRecordingDuration(d => d + 1);
    }, 1000);

    const isOffline = !navigator.onLine;

    try {
      await GuardianAudioService.startContinuousRecording(
        alertId || `queued_${Date.now()}`,
        isOffline,
        () => {
          setIsRecording(false);
          if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
          }
          setRecordingDuration(0);
        }
      );

      if (!isOffline && alertId) {
        GuardianAudioService.listenForResponders(alertId, () => {
          GuardianAudioService.stopContinuousRecording();
          setIsRecording(false);
          if (durationInterval.current) clearInterval(durationInterval.current);
          setRecordingDuration(0);
        });
      }
    } catch (err) {
      console.error('[GuardianPassive] Audio recording failed', err);
      setIsRecording(false);
    }

    // Vibrate pattern
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 500]);
    }

    if (onInitiateSOS) {
      onInitiateSOS('CRIME', description);
    }
  }, [createSOS, onInitiateSOS]);

  // ==================== SPEECH RECOGNITION ====================
  const startPassiveListening = useCallback(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn('[GuardianPassive] SpeechRecognition not supported on this device');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fil-PH';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (!finalTranscript) return;

      const confidence = event.results[0]?.[0]?.confidence ?? 1.0;
      if (confidence < 0.55) return;

      const { matched, phrase } = isTriggerPhrase(finalTranscript);
      if (!matched || !phrase) return;

      // 60-second safety debounce
      if (Date.now() - lastTriggerTime.current < 60000) return;
      lastTriggerTime.current = Date.now();

      setLastTriggerPhrase(phrase);
      triggerSOS(phrase);
    };

    recognition.onerror = (event: any) => {
      console.warn('[GuardianPassive] SpeechRecognition error:', event.error);
      if (shouldBeListening.current) {
        setTimeout(() => {
          if (shouldBeListening.current) startPassiveListening();
        }, 800);
      }
    };

    recognition.onend = () => {
      if (shouldBeListening.current) {
        setTimeout(() => {
          if (shouldBeListening.current) startPassiveListening();
        }, 400);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsPassiveActive(true);
    } catch (err) {
      console.error('[GuardianPassive] Failed to start recognition', err);
    }
  }, [triggerSOS]);

  const stopPassiveListening = useCallback(() => {
    shouldBeListening.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsPassiveActive(false);
  }, []);

  // ==================== LIFECYCLE ====================
  useEffect(() => {
    shouldBeListening.current = guardianMode;

    if (guardianMode) {
      startGeoWatch();
      startPassiveListening();
    } else {
      stopPassiveListening();
      stopGeoWatch();
      GuardianAudioService.stopContinuousRecording();
      setIsRecording(false);
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      setRecordingDuration(0);
    }

    return () => {
      stopPassiveListening();
      stopGeoWatch();
      if (durationInterval.current) clearInterval(durationInterval.current);
    };
  }, [guardianMode]);

  return {
    isPassiveActive,
    lastTriggerPhrase,
    isRecording,
    recordingDuration,
  };
}
