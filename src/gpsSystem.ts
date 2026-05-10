// =========================================
// GPS + SOCKET SYSTEM (WEB-ADAPTED)
// =========================================

/**
 * Note: Adapted from mobile (React Native) to Web Standard
 * to support the TanodNet Intelligence environment.
 */
import socket from './lib/socket';

let watchId: number | null = null;

export const startGPS = (
  userId: string,
  role: "citizen" | "tanod",
  onUpdate: (data: any) => void
) => {

  const handleLocationUpdate = (msg: any) => {
    onUpdate(msg);
  };

  socket.on("location_update", handleLocationUpdate);

  // Start tracking using Browser Geolocation API
  if ("geolocation" in navigator) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const payload = {
          user_id: userId,
          role,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: Date.now(),
        };

        socket.emit("location_update", payload);

        // Also update local listeners
        onUpdate({ [userId]: payload });
      },
      (err) => console.error("Geolocation Error:", err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  return () => {
    socket.off("location_update", handleLocationUpdate);
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  };
};
