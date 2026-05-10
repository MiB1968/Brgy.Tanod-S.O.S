import { useEffect, useRef } from 'react';
import { Howl } from 'howler';
import socket from '../lib/socket';
import { useIncidentStore } from '../store/useIncidentStore';
import { Alert } from '../types';

// High-volume emergency siren
const sosSiren = new Howl({
  src: ['https://assets.mixkit.co/active_storage/sfx/1004/1004-preview.mp3'], 
  loop: true,
  volume: 1.0,
});

export default function SOSAlertSiren({ userRole }: { userRole: string }) {
  const sirenRef = useRef<number | null>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userRole !== 'tanod' && userRole !== 'admin' && userRole !== 'superadmin') return;

    const handleNewAlert = (data: any) => {
      const alert = data.alert || data;
      if (alert && (alert.status === 'pending' || alert.status === 'active')) {
        // Trigger high-priority siren
        if (sirenRef.current === null) {
          sirenRef.current = sosSiren.play() as any;
          
          // Auto-stop after 10 seconds as requested
          if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
          stopTimeoutRef.current = setTimeout(() => {
            sosSiren.stop();
            sirenRef.current = null;
          }, 10000);
        }
      }
    };

    socket.on('alert_new', handleNewAlert);
    
    return () => {
      socket.off('alert_new', handleNewAlert);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      sosSiren.stop();
    };
  }, [userRole]);

  return null; // Silent component
}
