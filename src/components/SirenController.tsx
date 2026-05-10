import { useEffect } from 'react';
import { Howl } from 'howler';
import { User, Alert } from '../types';

// Siren sound
export const siren = new Howl({
  src: ['https://assets.mixkit.co/active_storage/sfx/1004/1004-preview.mp3'], // Emergency siren
  loop: true,
  volume: 0.5,
});

interface SirenControllerProps {
  globalSirenActive: boolean;
  profile: User | null;
  alerts: Alert[];
}

export default function SirenController({ globalSirenActive, profile, alerts }: SirenControllerProps) {
  useEffect(() => {
    // Alert sound logic
    if (globalSirenActive) {
      if (!siren.playing()) {
        siren.play();
      }
      return; 
    }

    if (!profile || (profile.role !== 'tanod' && profile.role !== 'admin' && profile.role !== 'superadmin')) {
      siren.stop();
      return;
    }

    const hasActive = alerts.some(a => a.status === 'pending');
    if (hasActive) {
      if (!siren.playing()) {
        siren.volume(1.0);
        siren.play();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        setTimeout(() => { if (!globalSirenActive) siren.stop(); }, 10000);
      }
    } else {
      siren.stop();
    }
    
    return () => { if (!globalSirenActive) siren.stop(); };
  }, [alerts, profile?.role, globalSirenActive]);

  return null;
}
