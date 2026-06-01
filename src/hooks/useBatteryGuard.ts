// src/hooks/useBatteryGuard.ts
import { useEffect, useState } from 'react';
import { useSOSStore } from '../store/useSOSStore';
import { useRBAC } from '../context/AuthContext';
import { batteryGuardService } from '../services/batteryGuardService';

export function useBatteryGuard() {
  const { activeAlert } = useSOSStore();
  const { profile } = useRBAC();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // 1. Determine if device is in a prolonged emergency state
    // Resident: Has an active SOS alert triggered
    // Tanod: Active on patrol or responding to threat level
    const isResidentInEmergency = !!activeAlert;
    const isTanodOnDuty = profile?.role === 'tanod' && (profile.status === 'Responding' || profile.status === 'On Patrol');
    
    const shouldEngage = isResidentInEmergency || isTanodOnDuty;

    const manageLock = async () => {
      if (shouldEngage) {
        const success = await batteryGuardService.acquireWakeLock();
        if (success) {
           setIsActive(true);
        }
      } else {
        await batteryGuardService.releaseWakeLock();
        setIsActive(false);
      }
    };

    manageLock();

    // Cleanup: restore safe low-energy profile when the controller unmounts
    return () => {
      batteryGuardService.releaseWakeLock();
    };
  }, [activeAlert, profile?.role, profile?.status]);

  return {
    isGuardActive: isActive && batteryGuardService.isGuardActive(),
    isSupported: batteryGuardService.isSupported()
  };
}
