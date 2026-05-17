// src/hooks/useTTS.ts
import { useCallback, useEffect, useRef, useState } from 'react';

interface TTSOptions {
  lang?: string;
  speed?: number;
  priority?: 'normal' | 'high'; // For future emergency prioritization
}

interface UseTTSReturn {
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  isReady: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
  stop: () => void;
  supported: boolean;
  retryCount: number;
  queueLength: number;
}

export function useTTS(): UseTTSReturn {
  const workerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const readyResolverRef = useRef<((value: boolean) => void) | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [queueLength, setQueueLength] = useState(0);

  const MAX_RETRIES = 3;
  const isLowEnd = useRef(false);

  const speechQueue = useRef<Array<{ text: string; options: TTSOptions }>>([]);
  const isProcessingQueue = useRef(false);

  // Device detection
  useEffect(() => {
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    isLowEnd.current = deviceMemory < 4 || cores <= 4;
  }, []);

  const createWorker = useCallback((): Worker => {
    const worker = new Worker(
      new URL('../workers/tts.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent) => {
      const { type, buffer, text, latency, message } = e.data;

      switch (type) {
        case 'READY':
          setIsReady(true);
          setError(null);
          setRetryCount(0);
          readyResolverRef.current?.(true);
          readyResolverRef.current = null;
          processQueue();
          break;

        case 'AUDIO_READY':
          setIsSpeaking(false);
          playAudioBuffer(buffer, text, latency);
          setTimeout(processQueue, 50); // Small gap between utterances
          break;

        case 'ERROR':
          setIsSpeaking(false);
          setError(message || 'TTS Error');
          fallbackToSpeechSynthesis(text || '');
          setTimeout(processQueue, 100);
          break;
      }
    };

    worker.onerror = () => handleWorkerCrash();
    return worker;
  }, []);

  const handleWorkerCrash = useCallback(() => {
    if (retryCount >= MAX_RETRIES) {
      setError('TTS worker failed after multiple retries. Using voice fallback.');
      setIsReady(false);
      return;
    }

    setRetryCount(prev => prev + 1);
    console.log(`[useTTS] Self-healing worker... (${retryCount + 1}/${MAX_RETRIES})`);

    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    setIsReady(false);

    setTimeout(() => {
      workerRef.current = createWorker();
      workerRef.current.postMessage({ type: 'INIT' });
    }, 400);
  }, [retryCount, createWorker]);

  const initWorker = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      readyResolverRef.current = resolve;

      if (workerRef.current) workerRef.current.terminate();

      workerRef.current = createWorker();
      workerRef.current.postMessage({ type: 'INIT' });

      setTimeout(() => {
        if (!isReady) resolve(false);
      }, 10000);
    });
  }, [createWorker, isReady]);

  // Queue Management
  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current || speechQueue.current.length === 0) return;

    isProcessingQueue.current = true;
    const item = speechQueue.current.shift()!;
    setQueueLength(speechQueue.current.length);

    try {
      setIsSpeaking(true);
      if (workerRef.current && isReady) {
        workerRef.current.postMessage({
          type: 'SPEAK',
          text: item.text,
          lang: item.options.lang || 'tl',
          speed: item.options.speed || 1.0,
        });
      } else {
        fallbackToSpeechSynthesis(item.text);
        setTimeout(processQueue, 300);
      }
    } catch (err) {
      fallbackToSpeechSynthesis(item.text);
      setTimeout(processQueue, 300);
    } finally {
      isProcessingQueue.current = false;
    }
  }, [isReady]);

  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    if (!text?.trim()) return;

    setError(null);
    setIsLoading(true);

    // Add to queue
    speechQueue.current.push({ text: text.trim(), options });
    setQueueLength(speechQueue.current.length);

    if (!workerRef.current || !isReady) {
      await initWorker();
    }

    setIsLoading(false);
    processQueue();
  }, [initWorker, processQueue]);

  const playAudioBuffer = useCallback((buffer: ArrayBuffer, text: string, latency?: number) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    audioContextRef.current.decodeAudioData(buffer, (decoded) => {
      const source = audioContextRef.current!.createBufferSource();
      source.buffer = decoded;
      source.connect(audioContextRef.current!.destination);
      source.start();
      console.log(`[TTS] Played: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
    });
  }, []);

  const fallbackToSpeechSynthesis = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fil-PH';
    utterance.rate = isLowEnd.current ? 0.95 : 1.05;
    window.speechSynthesis.speak(utterance);
  };

  const stop = useCallback(() => {
    speechQueue.current = [];
    setQueueLength(0);
    window.speechSynthesis?.cancel();
    if (audioContextRef.current) {
      audioContextRef.current.suspend();
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  // Initial setup
  useEffect(() => {
    initWorker();

    return () => {
      stop();
      workerRef.current?.terminate();
    };
  }, [initWorker, stop]);

  return {
    speak,
    isReady,
    isSpeaking,
    isLoading,
    error,
    stop,
    supported: 'Worker' in window && 'AudioContext' in window,
    retryCount,
    queueLength,
  };
}
