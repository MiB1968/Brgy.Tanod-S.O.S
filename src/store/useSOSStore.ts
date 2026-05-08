import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Alert, EmergencyType } from '../types';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  setDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface SOSState {
  activeAlert: Alert | null;
  offlineQueue: Omit<Alert, 'id'>[];
  isSending: boolean;
  setActiveAlert: (alert: Alert | null) => void;
  addToQueue: (alert: Omit<Alert, 'id'>) => void;
  syncQueue: () => Promise<void>;
  createSOS: (type: EmergencyType, description: string, location: { lat: number, lng: number }) => Promise<string | null>;
  subscribeToUserAlerts: (userId: string) => () => void;
}

export const useSOSStore = create<SOSState>()(
  persist(
    (set, get) => ({
      activeAlert: null,
      offlineQueue: [],
      isSending: false,
      setActiveAlert: (alert) => set({ activeAlert: alert }),
      addToQueue: (alert) =>
        set((state) => ({ offlineQueue: [...state.offlineQueue, alert] })),
      
      syncQueue: async () => {
        const { offlineQueue } = get();
        if (offlineQueue.length === 0 || !navigator.onLine) return;

        const stillQueued = [];
        for (const alertData of offlineQueue) {
          try {
            const id = crypto.randomUUID();
            await setDoc(doc(db, 'alerts', id), {
              ...alertData,
              id,
              timestamp: serverTimestamp(),
            });
          } catch (error) {
            console.error("Sync failed for alert", error);
            stillQueued.push(alertData);
          }
        }
        set({ offlineQueue: stillQueued });
      },

      createSOS: async (type, description, location) => {
        set({ isSending: true });
        const alertId = crypto.randomUUID();
        const user = auth.currentUser;

        const alertData: any = {
          id: alertId,
          residentId: user?.uid || 'anonymous',
          residentName: user?.displayName || 'Unknown Resident',
          type,
          location,
          status: 'pending',
          timestamp: new Date().toISOString(),
          customMessage: description,
          aiAnalysis: {
            incidentType: type.toUpperCase(),
            severityScore: 8,
            urgency: 'HIGH',
            summary: description
          }
        };

        try {
          if (navigator.onLine && db) {
            await setDoc(doc(db, 'alerts', alertId), alertData);
          } else {
            get().addToQueue(alertData);
          }
          return alertId;
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'alerts');
          get().addToQueue(alertData);
          return alertId;
        } finally {
          set({ isSending: false });
        }
      },

      subscribeToUserAlerts: (userId) => {
        if (!db) return () => {};
        
        const q = query(
          collection(db, 'alerts'),
          where('residentId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(1)
        );

        return onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data() as Alert;
            if (data.status !== 'resolved' && data.status !== 'cancelled') {
              set({ activeAlert: { ...data, id: snapshot.docs[0].id } });
            } else {
              set({ activeAlert: null });
            }
          } else {
            set({ activeAlert: null });
          }
        }, (error) => {
          console.error("SOS subscription error:", error);
        });
      }
    }),
    {
      name: 'sos-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ offlineQueue: state.offlineQueue }), // Only persist queue
    }
  )
);
