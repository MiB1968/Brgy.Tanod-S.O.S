import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSOSStore } from '../store/useSOSStore';
import { watchLocation } from '../lib/gps';
import socket from '../lib/socket';

export function useLocationTracking() {
  const { profile } = useAuthStore();
  const { activeAlert } = useSOSStore();

  useEffect(() => {
    if (!profile) return;

    let stopWatching: () => void = () => {};
    
    // Adaptive Throttling: High accuracy/no delay if in an SOS, otherwise throttle
    const isResponding = !!activeAlert;
    const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: isResponding ? 1000 : 30000 
    };

    if (profile.role === 'tanod' || (profile.role as string) === 'responder') {
      console.log("[useLocationTracking] Starting GPS tracking for Responder, Responding:", isResponding);
      stopWatching = watchLocation(
        (loc) => {
          if (socket.connected) {
            socket.emit('location_update', {
              user_id: profile.id,
              role: profile.role,
              lat: loc.lat,
              lng: loc.lng,
              name: profile.name,
              accuracy: loc.accuracy,
              status: isResponding ? 'responding' : 'patrolling'
            });
          }
        },
        (err) => {
          console.warn('[useLocationTracking] GPS tracking error:', err.message);
        },
        options
      );
    } else {
      stopWatching = watchLocation(
        (loc) => {
          if (socket.connected) {
            socket.emit('location_update', {
              user_id: profile.id,
              role: 'citizen',
              lat: loc.lat,
              lng: loc.lng,
              name: profile.name,
              accuracy: loc.accuracy,
              status: isResponding ? 'active' : 'idle'
            });
          }
        },
        (err) => {
          // Normal for citizens to deny GPS until SOS is triggered
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      stopWatching();
    };
  }, [profile, activeAlert]);
}
