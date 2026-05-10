import { useEffect } from 'react';
import socket from '../lib/socket';
import { useTanodStore } from '../store/useTanodStore';
import { useIncidentStore } from '../store/useIncidentStore';
import { SystemBroadcast, Alert, PatrolLocation } from '../types';

export const useRealtimeData = (user: any, setActiveBroadcast: (b: SystemBroadcast | null) => void, setGlobalSirenActive: (a: boolean) => void) => {
  const { setAlerts, addAlert } = useIncidentStore();
  const { setPatrols, updatePatrol } = useTanodStore();

  useEffect(() => {
    if (!user) return;

    // Siren updates
    socket.on('siren_update', (data: any) => {
      setGlobalSirenActive(data?.sirenActive || false);
    });

    // Alert updates
    socket.on('alert_update', ({ type, alert }: { type: string, alert: Alert }) => {
      if (type === 'new') {
        addAlert(alert);
      } else {
        // Handle other updates if needed
      }
    });

    // Patrol updates
    socket.on('patrol_update', (patrol: any) => {
      // Assuming 'patrol' maps correctly, update the patrol in the store 
      // Using updatePatrol if patrol has an ID
      if (patrol.id) {
         updatePatrol(patrol);
      }
    });

    return () => {
      socket.off('siren_update');
      socket.off('alert_update');
      socket.off('patrol_update');
    };
  }, [user, addAlert, setAlerts, setPatrols, setGlobalSirenActive]);
};
