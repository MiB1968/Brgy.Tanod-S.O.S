import { useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTanodStore } from '../store/useTanodStore';
import { useIncidentStore } from '../store/useIncidentStore';
import { SystemBroadcast, Alert, PatrolLocation } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const useRealtimeData = (user: any, setActiveBroadcast: (b: SystemBroadcast | null) => void, setGlobalSirenActive: (a: boolean) => void) => {
  useEffect(() => {
    if (!db || !user) return;
    
    // Broadcast listener
    const bQ = query(collection(db, 'system_broadcasts'), where('isActive', '==', true), orderBy('timestamp', 'desc'), limit(1));
    const unsubB = onSnapshot(bQ, (snapshot) => {
      if (!snapshot.empty) {
        const broadcast = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SystemBroadcast;
        setActiveBroadcast(broadcast);
      } else {
        setActiveBroadcast(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'system_broadcasts'));

    // Siren listener
    const unsubS = onSnapshot(doc(db, 'system', 'siren'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGlobalSirenActive(data?.sirenActive || false);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'system/siren'));

    return () => {
      unsubB();
      unsubS();
    };
  }, [user]);
};
