// src/hooks/useAudioInitializer.ts
import { useEffect } from 'react';
import { EmergencySoundManager } from '../lib/EmergencySoundManager';

export const useAudioInitializer = () => {
  useEffect(() => {
    const initAudio = async () => {
      try {
        const manager = EmergencySoundManager.getInstance();
        await manager.initialize();
        console.log('✅ Audio System Initialized');
      } catch (err) {
        console.warn('Audio init failed (expected on some mobile)', err);
      }
    };

    // Initialize early
    initAudio();

    // Resume on user interaction (critical for mobile)
    const resumeOnInteraction = () => {
      const manager = EmergencySoundManager.getInstance();
      manager.initialize();
      document.removeEventListener('touchstart', resumeOnInteraction);
      document.removeEventListener('click', resumeOnInteraction);
    };

    document.addEventListener('touchstart', resumeOnInteraction, { once: true });
    document.addEventListener('click', resumeOnInteraction, { once: true });

    return () => {
      document.removeEventListener('touchstart', resumeOnInteraction);
      document.removeEventListener('click', resumeOnInteraction);
    };
  }, []);
};
