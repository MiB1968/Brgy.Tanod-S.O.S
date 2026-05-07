import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Alert } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface SOSState {
  activeAlert: Alert | null;
  offlineQueue: Omit<Alert, 'id'>[];
  setActiveAlert: (alert: Alert | null) => void;
  addToQueue: (alert: Omit<Alert, 'id'>) => void;
  syncQueue: () => Promise<void>;
}

export const useSOSStore = create<SOSState>()(
  persist(
    (set, get) => ({
      activeAlert: null,
      offlineQueue: [],
      setActiveAlert: (alert) => set({ activeAlert: alert }),
      addToQueue: (alert) =>
        set((state) => ({ offlineQueue: [...state.offlineQueue, alert] })),
      syncQueue: async () => {
        const { offlineQueue } = get();
        if (offlineQueue.length === 0) return;

        const stillQueued = [];
        for (const alertData of offlineQueue) {
          try {
            await addDoc(collection(db, 'alerts'), {
              ...alertData,
              timestamp: serverTimestamp(),
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'alerts');
            stillQueued.push(alertData);
          }
        }
        set({ offlineQueue: stillQueued });
      },
    }),
    {
      name: 'sos-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
