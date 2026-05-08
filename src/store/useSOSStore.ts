import { create } from 'zustand';
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
  doc 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { analyzeIncident } from '../services/aiService';
import { queueSOS } from '../lib/offlineQueue';

interface SOSState {
  activeAlert: Alert | null;
  isSending: boolean;
  setActiveAlert: (alert: Alert | null) => void;
  createSOS: (type: EmergencyType, description: string, location: { lat: number, lng: number }) => Promise<string | null>;
  subscribeToUserAlerts: (userId: string) => () => void;
}

export const useSOSStore = create<SOSState>()(
  (set, get) => ({
    activeAlert: null,
    isSending: false,
    setActiveAlert: (alert) => set({ activeAlert: alert }),
    
    createSOS: async (type, description, location) => {
      set({ isSending: true });
      const alertId = crypto.randomUUID();
      const user = auth.currentUser;

      // Perform AI Analysis if online (fallback in service if offline)
      const aiAnalysis = await analyzeIncident(description, type);

      const alertData: any = {
        id: alertId,
        residentId: user?.uid || 'anonymous',
        residentName: user?.displayName || 'Unknown Resident',
        type,
        location,
        status: 'pending',
        timestamp: new Date().toISOString(),
        customMessage: description,
        aiAnalysis
      };

      try {
        if (navigator.onLine && db) {
          await setDoc(doc(db, 'alerts', alertId), alertData);
        } else {
          // Store in IndexedDB for robust background sync
          await queueSOS(alertData);
        }
        return alertId;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'alerts');
        // Even on error, attempt to queue locally
        await queueSOS(alertData);
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
);
