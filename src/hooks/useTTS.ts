import { useRef, useCallback, useState } from 'react';

export type TTSState = 'idle' | 'loading' | 'speaking' | 'error';

/**
 * Hook to manage fully offline Web Worker based TTS execution via Supertonic.
 * Includes lifecycle management, state exposure, and queue/playback.
 */
export function useTTS() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<TTSState>('idle');
  const audioCtxRef = useRef<AudioContext | null>(null);

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
  const speak = useCallback(async (text: string, lang = 'en') => {
    if (!text.trim()) return;
    
    // [ASSUMPTION]: For extremely low-end devices, we might want to check navigator.deviceMemory and abort.
    // if ('deviceMemory' in navigator && (navigator as any).deviceMemory < 2) {
    //   console.warn("Low memory device detected. Skipping local TTS.");
    //   return;
    // }

    setState('loading');

    const worker = getWorker();

    return new Promise<void>((resolve, reject) => {
      worker.onmessage = async (e) => {
        if (e.data.type === 'audio') {
          setState('speaking');
          // Start playback process
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

      worker.postMessage({ text, lang });
    });
  }, [getWorker]);

  return { speak, state };
}
