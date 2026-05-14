import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { watchLocation } from '../lib/gps';
import socket from '../lib/socket';

export function useLocationTracking() {
  const { profile } = useAuthStore();

  useEffect(() => {
    if (!profile) return;

    let stopWatching: () => void = () => {};

    if (profile.role === 'tanod' || (profile.role as string) === 'responder') {
      console.log("[useLocationTracking] Starting GPS tracking for Responder");
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
              status: 'patrolling'
            });
          }
        },
        (err) => {
          console.warn('[useLocationTracking] GPS tracking error:', err.message);
        }
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
              status: 'active'
            });
          }
        },
        (err) => {
          // Normal for citizens to deny GPS until SOS is triggered
        }
      );
    }

    return () => {
      stopWatching();
    };
  }, [profile]);
}
