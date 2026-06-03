// NEW FILE: src/hooks/useOnlineStatus.ts
//
// MED-03 — isOnline={true} was hardcoded in App.tsx line 347.
// The offline-first SOS queue and sync service never saw the actual
// network state from the UI layer.
//
// This hook:
//   • Returns live network status from navigator.onLine
//   • Listens to 'online' / 'offline' window events
//   • Debounces rapid flaps (common on mobile when switching towers)
//   • Triggers the syncService flush when connectivity is restored

import { useState, useEffect, useCallback } from 'react';
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

  const handleOnline = useCallback(() => {
    setIsReconnecting(true);
    // Brief debounce before declaring truly online
    const timer = setTimeout(() => {
      setIsOnline(true);
      setIsReconnecting(false);
      setLastChanged(new Date().toISOString());
      console.log('[Network] Connection restored — triggering offline queue flush');
      // Flush any queued SOS / location updates
      syncService.processQueue().catch((err) =>
        console.warn('[Network] Queue flush failed:', err)
      );
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setIsReconnecting(false);
    setLastChanged(new Date().toISOString());
    console.log('[Network] Connection lost — offline mode active');
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, isReconnecting, lastChanged };
}

// ── App.tsx wiring ───────────────────────────────────────────────────────────
//
// 1. Import at top of App.tsx:
//    import { useOnlineStatus } from './hooks/useOnlineStatus';
//
// 2. Add inside the App component (near other hooks):
//    const { isOnline, isReconnecting } = useOnlineStatus();
//
// 3. Replace line 347:
//    BEFORE:  isOnline={true}
//    AFTER:   isOnline={isOnline}
//
// 4. Optionally show a reconnecting banner:
//    {isReconnecting && (
//      <div className="text-xs text-yellow-400 text-center py-1 bg-yellow-900/30">
//        Reconnecting...
//      </div>
//    )}
