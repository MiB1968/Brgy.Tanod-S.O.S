import { useState, useEffect } from 'react';
import { CloudOff, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function OfflineSyncButton() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkOfflineQueue = async () => {
      try {
        const { db } = await import('../../db/offlineDB');
        const count = await db.queuedActions.count();
        setOfflineCount(count);
      } catch (err) {
        console.warn('Error checking offline queue:', err);
      }
    };

    checkOfflineQueue();
    // Re-check periodically
    const interval = setInterval(checkOfflineQueue, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline) {
      toast.error('Currently offline. Cannot sync.');
      return;
    }

    if (offlineCount === 0) {
      toast.success('Everything is synced!');
      return;
    }

    setSyncing(true);
    try {
      const { offlineService } = await import('../../services/offlineService');
      await offlineService.processOfflineQueue();
      setOfflineCount(0);
      toast.success('Offline actions successfully synchronized.');
    } catch (err: any) {
      console.error('Sync failed:', err);
      toast.error('Failed to sync some offline actions.');
    } finally {
      setSyncing(false);
    }
  };

  if (offlineCount === 0 && isOnline) {
    return null; // Don't show if there's nothing to do
  }

  return (
    <button
      onClick={handleSync}
      disabled={syncing || !isOnline}
      className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg font-mono text-sm tracking-wider z-50 transition-all ${
        !isOnline 
          ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
          : syncing 
            ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
            : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/30'
      }`}
    >
      {!isOnline && <CloudOff className="w-5 h-5" />}
      {isOnline && syncing && <RefreshCw className="w-5 h-5 animate-spin" />}
      {isOnline && !syncing && <CheckCircle className="w-5 h-5" />}
      
      {!isOnline && <span>Offline Mode ({offlineCount} queued)</span>}
      {isOnline && syncing && <span>Synchronizing...</span>}
      {isOnline && !syncing && <span>Sync Now ({offlineCount})</span>}
    </button>
  );
}
