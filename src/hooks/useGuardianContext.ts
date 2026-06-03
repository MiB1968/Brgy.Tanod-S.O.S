// src/hooks/useGuardianContext.ts
import { useState, useEffect } from 'react';
import { GuardianContext } from '../types/ai';
import { useRBAC } from '../context/AuthContext';
import { useOnlineStatus } from './useOnlineStatus';

export const useGuardianContext = () => {
  const { profile, user } = useRBAC();
  const { isOnline } = useOnlineStatus();
  const [context, setContext] = useState<GuardianContext>({
    pendingSOS: 0,
    activeTanods: 3,
    isSuperAdmin: profile?.role === 'super_admin' || profile?.role === 'admin',
    role: profile?.role || 'resident',
    hasActiveSOS: false,
    isOnline,
  });

  // Auto-update context when auth or online status changes
  useEffect(() => {
    setContext(prev => ({
      ...prev,
      role: profile?.role || 'resident',
      isSuperAdmin: profile?.role === 'super_admin' || profile?.role === 'admin',
      isOnline,
    }));
  }, [profile?.role, isOnline]);

  // Connect to active SOS changes
  const updateActiveSOS = (hasActive: boolean, details?: string) => {
    setContext(prev => ({
      ...prev,
      hasActiveSOS: hasActive,
      activeSOSDetails: details,
    }));
  };

  // Connect to location tracking
  const updateLocation = (lat: number, lng: number, address?: string) => {
    setContext(prev => ({
      ...prev,
      location: { lat, lng, address },
    }));
  };

  return {
    context,
    updateActiveSOS,
    updateLocation,
  };
};
