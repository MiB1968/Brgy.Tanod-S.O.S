import { useState, useEffect, useCallback, useRef } from 'react';
import { syncService } from '../services/syncService';

interface OnlineStatus {
  isOnline: boolean;
  /** True during the debounce window after a flap — UI can show 'reconnecting...' */
  isReconnecting: boolean;
  /** ISO timestamp of the last status change */
  lastChanged: string;
}

const DEBOUNCE_MS = 2_000; // ignore blips shorter than 2 seconds

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastChanged, setLastChanged] = useState(() => new Date().toISOString());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleOnline = useCallback(() => {
    setIsReconnecting(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      setIsOnline(true);
      setIsReconnecting(false);
      setLastChanged(new Date().toISOString());
      console.log('[Network] Connection restored — triggering offline queue flush');
      // Flush any queued SOS / location updates
      syncService.syncPendingReports().catch((err) =>
        console.warn('[Network] Queue flush failed:', err)
      );
    }, DEBOUNCE_MS);
  }, []);

  const handleOffline = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsOnline(false);
    setIsReconnecting(false);
    setLastChanged(new Date().toISOString());
    console.log('[Network] Connection lost — offline mode active');
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, isReconnecting, lastChanged };
}
