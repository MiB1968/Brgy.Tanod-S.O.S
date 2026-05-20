// src/hooks/useGeolocation.ts
import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

export function useGeolocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback((): Promise<Location> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          setLocation(loc);
          setLoading(false);
          resolve(loc);
        },
        (err) => {
          let message = "Failed to get location";
          switch (err.code) {
            case err.PERMISSION_DENIED:
              message = "Location permission denied";
              break;
            case err.POSITION_UNAVAILABLE:
              message = "Location information unavailable";
              break;
            case err.TIMEOUT:
              message = "Location request timed out";
              break;
          }
          setError(message);
          setLoading(false);
          toast.error(message);
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  const watchLocation = useCallback((callback: (loc: Location) => void) => {
    if (!navigator.geolocation) return () => {};

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const loc: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        setLocation(loc);
        callback(loc);
      },
      (err) => console.warn("Watch position error:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    watchLocation,
  };
}
