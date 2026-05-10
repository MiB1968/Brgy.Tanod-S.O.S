import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { watchLocation } from '../lib/gps';
import socket from '../lib/socket';

export default function BackgroundServices() {
  const { profile } = useAuthStore();

  useEffect(() => {
    // Update socket token if profile changes
    const token = localStorage.getItem('token');
    if (token) {
      socket.auth = { token };
      if (!socket.connected) {
        socket.connect();
      }
    } else {
      socket.disconnect();
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    let stopWatching: () => void = () => {};

    // Continuous GPS Tracking for everyone who is logged in (TBD depending on requirements)
    // But importantly for Tanods:
    if (profile.role === 'tanod' || (profile.role as string) === 'responder') {
      console.log("[BackgroundServices] Starting GPS tracking for Responder");
      stopWatching = watchLocation(
        (loc) => {
          if (socket.connected) {
            socket.emit('location_update', {
              user_id: profile.id,
              role: profile.role,
              lat: loc.lat,
              lng: loc.lng,
              name: profile.name,
              accuracy: loc.accuracy
            });
          }
        },
        (err) => {
          console.warn('[BackgroundServices] GPS tracking error:', err.message);
        }
      );
    } else {
      // Periodic ping for normal citizens so they can be matched if needed
      stopWatching = watchLocation(
        (loc) => {
          if (socket.connected) {
            socket.emit('location_update', {
              user_id: profile.id,
              role: 'citizen',
              lat: loc.lat,
              lng: loc.lng,
              name: profile.name,
              accuracy: loc.accuracy
            });
          }
        },
        (err) => {
          // It's normal for citizens to deny GPS until they trigger SOS
        }
      );
    }

    return () => {
      stopWatching();
    };
  }, [profile]);

  return null;
}
