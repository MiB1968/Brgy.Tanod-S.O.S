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

    if (!profile) {
      siren.stop();
      return;
    }

    // Determine if siren should sound based on role and alert context
    let shouldSound = false;

    if (profile.role === 'tanod' || profile.role === 'admin' || profile.role === 'superadmin') {
      // Responders and Admins hear sirens for ANY pending alert
      shouldSound = alerts.some(a => a.status === 'pending');
    } else if (profile.role === 'resident') {
      // Residents ONLY hear sirens for THEIR OWN pending alerts
      shouldSound = alerts.some(a => a.status === 'pending' && a.residentId === profile.id);
    }

    if (shouldSound) {
      if (!siren.playing()) {
        siren.volume(1.0);
        siren.play();
        setTimeout(() => { if (!globalSirenActive) siren.stop(); }, 10000);
      }
    } else {
      siren.stop();
    }
    
    return () => { if (!globalSirenActive) siren.stop(); };
  }, [alerts, profile?.role, globalSirenActive]);

  return null;
}
