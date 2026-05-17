import { useState, useEffect } from 'react';
import { db as offlineDB } from '../db/offlineDB';

export const useOfflineQueue = () => {
  const [queueSize, setQueueSize] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await offlineDB.outbox.count();
        setQueueSize(count);
      } catch (e) {
        console.error(e);
        setQueueSize(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();

    // Refresh every few seconds while app is open
    const interval = setInterval(fetchCount, 4000);
    return () => clearInterval(interval);
  }, []);

  return { queueSize, loading };
};
