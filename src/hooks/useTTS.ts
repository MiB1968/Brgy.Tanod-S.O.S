import { useRef, useCallback, useState, useEffect } from 'react';

export type TTSState = 'idle' | 'loading' | 'speaking' | 'error';

/**
 * Hook to manage fully offline Web Worker based TTS execution via Supertonic.
 * Includes lifecycle management, state exposure, and queue/playback.
 */
export function useTTS() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<TTSState>('idle');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isLowEnd = useRef(false);

  useEffect(() => {
    const deviceMemory = (navigator as any).deviceMemory || 4;
    isLowEnd.current = deviceMemory < 4 || /Android.*(SM-A|SM-J| Moto G)/i.test(navigator.userAgent);
  }, []);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      // Lazy-init: only load the worker (and model) when first needed
      workerRef.current = new Worker(
        new URL('../workers/tts.worker', import.meta.url),
        { type: 'module' }
      );
    }
    return workerRef.current;
  }, []);

  /**
   * Speak a given text using offline Web Worker.
   */
  const speak = useCallback(async (text: string, lang = 'en', options?: { priority?: 'high' | 'normal' }) => {
    if (!text.trim()) return;
    
    if (isLowEnd.current && (navigator as any).deviceMemory < 2) {
      console.warn("Extremely low memory device detected (<2GB). Skipping heavy local TTS entirely.");
      return;
    }

    setState('loading');

    // 1. Try Google TTS if online
    if (navigator.onLine) {
       // Mock of what Google TTS try/catch would look like:
       // try { await playGoogleTTS(text); setState('idle'); return; } catch (err) { /* fallback to offline */ }
       // For now, if online, just log and fallback to local worker to test it anyway, 
       // but in a full implementation this branch invokes voiceService or server TTS.
    }

    // 2. Offline Fallback using Web Worker
    const worker = getWorker();

    return new Promise<void>((resolve, reject) => {
      worker.onmessage = async (e) => {
        if (e.data.type === 'audio') {
          setState('speaking');
          const ctx = audioCtxRef.current ||= new AudioContext();
          try {
            const buf = await ctx.decodeAudioData(e.data.pcm);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start();
            src.onended = () => { 
                setState('idle'); 
                resolve(); 
            };
          } catch (decodeErr) {
            setState('error');
            reject(decodeErr);
          }
        } else if (e.data.type === 'error') {
          setState('error');
          reject(e.data.error);
        }
      };
      
      worker.onerror = (err) => {
        setState('error');
        reject(err.message);
      };

      worker.postMessage({ text, voicePreset: lang === 'en' ? 'default' : lang, lowMemory: isLowEnd.current });
    });
  }, [getWorker]);

  return { speak, state };
}
