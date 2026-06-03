import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSOSStore } from '../store/useSOSStore';
import { normalizeRole } from '../utils/roleUtils';
import socket from '../lib/socket';
import { LocationUpdate } from '../types';

interface UseLocationTrackingOptions {
  enabled?: boolean;
  onLocationUpdate?: (location: LocationUpdate) => void;
}

export function useLocationTracking(options: UseLocationTrackingOptions = {}) {
  const { enabled = true, onLocationUpdate } = options;

  const profile = useAuthStore((state) => state.profile);
  const activeAlert = useSOSStore((state) => state.activeAlert);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<number>(0);

  const role = profile ? normalizeRole(profile.role) : null;
  const isTanod = role === 'tanod';
  const isCitizenWithActiveSOS = role === 'resident' && !!activeAlert;

  // SOS: 3s, Patrol: 8s
  const updateIntervalMs = isCitizenWithActiveSOS ? 3000 : 8000;

  useEffect(() => {
    if (!enabled || !profile || (!isTanod && !isCitizenWithActiveSOS)) return;

    const sendLocation = (coords: GeolocationCoordinates) => {
      const now = Date.now();
      if (now - lastSentRef.current < updateIntervalMs) return;
      lastSentRef.current = now;

      const payload: LocationUpdate = {
        userId: profile.id,
        role: role!,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        speed: coords.speed ?? undefined,
        heading: coords.heading ?? undefined,
        timestamp: new Date().toISOString(),
        alertId: activeAlert?.id ?? null,
      };

      socket.emit('location_update', payload);
      onLocationUpdate?.(payload);
    };

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => sendLocation(position.coords),
        (error) => console.error('[useLocationTracking] Geolocation error:', error),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => sendLocation(position.coords),
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }, updateIntervalMs);

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, profile, isTanod, isCitizenWithActiveSOS, activeAlert?.id, updateIntervalMs, role, onLocationUpdate]);

  return {
    isTracking: enabled && (isTanod || isCitizenWithActiveSOS),
    isHighFrequency: isCitizenWithActiveSOS,
  };
}
