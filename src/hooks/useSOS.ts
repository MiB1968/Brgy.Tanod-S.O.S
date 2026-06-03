// src/hooks/useSOS.ts
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sosService, SOSReport } from '../services/sosService';
import { useRBAC } from '../context/AuthContext';

export const useSOS = () => {
  const { user } = useRBAC();
  const [activeSOS, setActiveSOS] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myActiveSOS, setMyActiveSOS] = useState<any | null>(null);

  // Listen to active SOS alerts
  useEffect(() => {
    // Index-free query: query by status only, sort locally to prevent Firestore index requirements
    const q = query(
      collection(db, 'alerts'),
      where('status', 'in', ['pending', 'responding']),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort locally by timestamp descending (using Firestore Timestamp or fallback raw dates)
      alerts.sort((a: any, b: any) => {
        const getMs = (val: any) => {
          if (!val) return 0;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          if (val.seconds) return val.seconds * 1000;
          return new Date(val).getTime() || 0;
        };
        return getMs(b.timestamp) - getMs(a.timestamp);
      });

      setActiveSOS(alerts);
      setLoading(false);
    }, (error) => {
      console.error('[useSOS] Error in active alerts snapshot:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Track user's own active SOS
  useEffect(() => {
    if (!user) {
      setMyActiveSOS(null);
      return;
    }

    const q = query(
      collection(db, 'alerts'),
      where('residentId', '==', user.uid),
      where('status', 'in', ['pending', 'responding'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setMyActiveSOS({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setMyActiveSOS(null);
      }
    }, (error) => {
      console.error('[useSOS] Error in my active alerts snapshot:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const triggerSOS = async (report: Omit<SOSReport, 'reportedBy'>) => {
    if (!user) throw new Error('User not authenticated');

    return await sosService.triggerSOS({
      ...report,
      reportedBy: user.uid,
    });
  };

  return {
    activeSOS,
    myActiveSOS,
    loading,
    triggerSOS,
  };
};

export default useSOS;
