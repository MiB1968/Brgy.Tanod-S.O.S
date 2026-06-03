import { useEffect, useState } from 'react';
import { tanodLocationService } from '../services/tanodLocationService';
import { TanodLocation, TanodStatus } from '../types/tanod';
import { useRBAC } from '../context/AuthContext';

export const useTanodIntegration = () => {
  const { profile, user } = useRBAC();
  const [activeTanods, setActiveTanods] = useState<TanodLocation[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  const isTanod = profile?.role === 'tanod';
  const uid = user?.uid || profile?.uid || profile?.id;

  // Start/stop tracking if user is a Tanod
  useEffect(() => {
    if (!isTanod || !uid) return;

    tanodLocationService.startTracking(uid, (location) => {
      console.log('Tanod location updated in integration hook:', location);
    });
    setIsTracking(true);

    return () => {
      tanodLocationService.stopTracking();
      setIsTracking(false);
    };
  }, [isTanod, uid]);

  // Listen to all active Tanods (for map / admin view)
  useEffect(() => {
    const unsubscribe = tanodLocationService.listenToActiveTanods((tanods) => {
      setActiveTanods(tanods);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const updateStatus = async (status: TanodStatus) => {
    if (!uid) return;
    await tanodLocationService.updateTanodStatus(uid, status);
  };

  return {
    activeTanods,
    isTracking,
    isTanod,
    updateTanodStatus: updateStatus,
  };
};
