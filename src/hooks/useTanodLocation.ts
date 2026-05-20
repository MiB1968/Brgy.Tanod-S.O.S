// src/hooks/useTanodLocation.ts
import { useEffect, useRef, useCallback } from "react";
import { useRBAC } from "../context/AuthContext";
import { toast } from "react-hot-toast";

type LocationUpdateParams = {
  tanodId: string;
  tanodName?: string;
  location: { lat: number; lng: number; accuracy?: number };
  speed?: number;
  heading?: number;
  timestamp: number;
  isActive: boolean;
  batteryLevel?: number;
};

export function useTanodLocation(
  emitLocationUpdate?: (data: LocationUpdateParams) => void,
) {
  const { role, profile } = useRBAC();
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  const isTrackingRef = useRef(false);
  const emitRef = useRef(emitLocationUpdate);

  useEffect(() => {
    emitRef.current = emitLocationUpdate;
  }, [emitLocationUpdate]);

  const startBackgroundTracking = useCallback(() => {
    // Only Tanod should track
    if (role !== "tanod" && role !== "superadmin") {
      stopTracking();
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }

    if (isTrackingRef.current) return; // Prevent multiple trackers

    console.log("🛡️ Starting Tanod background location tracking...");

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();

        // Throttle to every 8 seconds to save battery
        if (now - lastSentRef.current < 8000) return;

        let batteryLevel;
        if ((navigator as any).getBattery) {
          const battery = await (navigator as any).getBattery();
          batteryLevel = battery.level;
        }

        const locationData = {
          tanodId: profile?.id || profile?.uid || "unknown",
          tanodName: profile?.name || "Unknown Tanod",
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
          },
          speed: position.coords.speed
            ? Math.round(position.coords.speed * 3.6)
            : 0, // km/h
          heading: position.coords.heading || 0,
          timestamp: position.timestamp,
          isActive: true,
          batteryLevel,
        };

        if (emitRef.current) {
          try {
            emitRef.current(locationData);
            lastSentRef.current = now;
            isTrackingRef.current = true;

            // Optional: Show subtle feedback every 30 seconds
            if (now % 30000 < 8000) {
              console.log(
                `📍 Tanod location updated: ${locationData.location.lat.toFixed(5)}, ${locationData.location.lng.toFixed(5)}`,
              );
            }
          } catch (error) {
            console.warn("Failed to send Tanod location update:", error);
          }
        }
      },
      (error) => {
        console.error("Tanod Location Error:", error);
        let message = "Location tracking issue";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location unavailable";
            break;
          case error.TIMEOUT:
            message = "Location timeout";
            break;
        }
        toast.error(message, { id: "tanod-location" });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    );

    isTrackingRef.current = true;
    toast.success("🛡️ Background Tracking Active", {
      id: "tanod-tracking",
      duration: 3000,
    });
  }, [role, profile]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    isTrackingRef.current = false;
    console.log("⏹️ Tanod location tracking stopped");
  }, []);

  // Auto start/stop based on role
  useEffect(() => {
    if (role === "tanod") {
      startBackgroundTracking();
    } else {
      stopTracking();
    }

    // Cleanup on unmount
    return () => {
      stopTracking();
    };
  }, [role, startBackgroundTracking, stopTracking]);

  return {
    startBackgroundTracking,
    stopTracking,
    isTracking: isTrackingRef.current,
  };
}
