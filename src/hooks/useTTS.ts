// src/hooks/useTTS.ts
import { useCallback, useRef } from 'react';
import { getTagalogMessage, type PhraseKey } from '../lib/tagalogPhrases';
import { createTagalogSSML, emergencySSML } from '../lib/ssmlTagalog';

interface TTSSpeakOptions {
  text?: string;
  ssml?: string;
  phraseKey?: PhraseKey;
  vars?: Record<string, string>;
  language?: 'fil' | 'en';
  style?: 'calm' | 'urgent' | 'authoritative' | 'reassuring';
  priority?: 'high' | 'normal' | 'low';
  voice?: string;
}

export const useTTS = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<Array<{ audioUrl: string; priority: number }>>([]);
  const isPlayingRef = useRef(false);

  const speak = useCallback(async (options: TTSSpeakOptions) => {
    const {
      text,
      ssml,
      phraseKey,
      vars = {},
      language = 'fil',
      style = 'calm',
      priority = 'normal',
      voice = 'fil-PH-Wavenet-A',
    } = options;

    let finalText = text || '';
    let finalSSML = ssml;

    // 1. Generate text from phrase key if provided
    if (phraseKey) {
      finalText = getTagalogMessage(phraseKey, vars);
    }

    // 2. Generate SSML if not provided
    if (!finalSSML && finalText) {
      if (style === 'urgent' || priority === 'high') {
        finalSSML = emergencySSML.sosActivated; // You can expand this
      } else {
        finalSSML = createTagalogSSML(finalText, style);
      }
    }

    if (!finalText && !finalSSML) {
      console.warn('TTS: No text or SSML provided');
      return;
    }

    try {
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: finalText,
          ssml: finalSSML,
          language,
          style,
          voice,
          priority,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && (contentType.includes('application/json') || contentType.includes('text/html'))) {
         throw new Error(`TTS API error: Invalid content type ${contentType}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Add to queue with priority
      const queueItem = { 
        audioUrl, 
        priority: priority === 'high' ? 1 : 0 
      };

      queueRef.current.push(queueItem);
      // Sort so high priority plays first
      queueRef.current.sort((a, b) => b.priority - a.priority);

      if (!isPlayingRef.current) {
        playNext();
      }
    } catch (error) {
      console.error('TTS Backend Error:', error);

      // Fallback: Browser Speech Synthesis (still supports Tagalog)
      const utterance = new SpeechSynthesisUtterance(finalText || 'May error sa sistema.');
      utterance.lang = language === 'fil' ? 'fil-PH' : 'en-US';
      utterance.rate = style === 'urgent' ? 1.15 : 0.95;
      utterance.pitch = style === 'urgent' ? 1.1 : 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const playNext = () => {
    if (queueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const { audioUrl } = queueRef.current.shift()!;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = 0.92;
    }

    audioRef.current.src = audioUrl;

    audioRef.current.onended = () => {
      URL.revokeObjectURL(audioUrl);
      setTimeout(playNext, 300); // Small pause between messages
    };

    audioRef.current.play().catch((err) => {
      console.error('Audio playback error:', err);
      URL.revokeObjectURL(audioUrl);
      playNext();
    });
  };

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    window.speechSynthesis.cancel();
    queueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  const isSpeaking = () => isPlayingRef.current || queueRef.current.length > 0;

  return { 
    speak, 
    stop, 
    isSpeaking,
    isReady: true,
    isLoading: false,
    retryCount: 0,
    queueLength: queueRef.current.length,
    error: null
  };
};
