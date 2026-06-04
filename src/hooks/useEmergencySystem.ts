import toast from "react-hot-toast";
import { useState, useEffect } from 'react';
import socket from '../lib/socket';
import * as api from '../lib/api';

export const useEmergencySystem = (isResponding: boolean) => {
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 1. MONITOR ONLINE STATUS
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData(); // Automatic sync pag nagka-signal
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. ADAPTIVE GPS (Battery Optimization)
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    // GPS is handled centrally by tanodLocationService now.
    // We only fetch a quick single fix when needed for UI/SOS initialization.
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
      },
      (err) => console.error("GPS Error:", err),
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  }, [isResponding]);

  // 3. OFFLINE SYNC LOGIC
  const triggerSOS = async (sosDetails: any) => {
    const sosData = {
      ...sosDetails,
      location,
      timestamp: new Date().toISOString(),
    };

    if (navigator.onLine) {
      return await sendSOSToServer(sosData);
    } else {
      // SAVE LOCALLY IF OFFLINE (Dead Spot Protection)
      const pending = JSON.parse(localStorage.getItem('offline_sos_queue') || '[]');
      pending.push(sosData);
      localStorage.setItem('offline_sos_queue', JSON.stringify(pending));
      toast("⚠️ Weak signal. SOS saved and will be sent automatically once online.");
      return { success: false, status: 'QUEUED' };
    }
  };

  const syncOfflineData = async () => {
    const pending = JSON.parse(localStorage.getItem('offline_sos_queue') || '[]');
    if (pending.length === 0) return;

    console.log(`Syncing ${pending.length} offline reports...`);
    for (const report of pending) {
      await sendSOSToServer(report);
    }
    localStorage.removeItem('offline_sos_queue');
    toast("✅ All offline SOS reports have been synced!");
  };

  return { location, isOnline, triggerSOS };
};

// Internal helpers to connect to existing services
async function sendLocationToServer(coords: any) { 
    socket.emit('location_update', coords);
}
async function sendSOSToServer(data: any) { 
    return await api.alerts.create(data);
}
