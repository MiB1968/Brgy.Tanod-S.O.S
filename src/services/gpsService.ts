import * as api from '../lib/api';
import socket from '../lib/socket';

let watchId: number | null = null;

export const startGPSTracking = (
  uid: string,
  role: 'resident' | 'tanod' | 'admin',
  onUpdate: (data: any) => void
) => {
  // Listen for tanod locations via Socket.io instead of Firestore onSnapshot
  socket.on('tanod_locations', (locations: any) => {
    onUpdate(locations);
  });

  // Start browser geolocation tracking
  if ("geolocation" in navigator) {
    watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          
          // Send to API
          await api.generic.update(`gps/heartbeat`, {
            id: uid,
            role,
            lat,
            lng,
            timestamp: new Date().toISOString()
          });

          // Also emit via socket for real-time smoothness
          if (role === 'tanod') {
            socket.emit('tanod_move', { id: uid, lat, lng });
          }
        } catch (err: any) {
          console.error("GPS Update error:", err);
        }
      },
      (err) => console.error("Geolocation error:", err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  return () => {
    socket.off('tanod_locations');
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  };
};

/**
 * Calculates distance between two points (Haversine formula equivalent)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
