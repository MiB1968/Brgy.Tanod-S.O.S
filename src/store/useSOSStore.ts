import { create } from 'zustand';
import { Alert, EmergencyType } from '../types';
import * as api from '../lib/api';
import socket from '../lib/socket';
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
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      // Perform AI Analysis
      const aiAnalysis = await analyzeIncident(description, type);

      const alertData: any = {
        residentId: user?.id || 'anonymous',
        residentName: user?.name || 'Unknown Resident',
        type,
        location,
        status: 'pending',
        timestamp: new Date().toISOString(),
        customMessage: description,
        aiAnalysis
      };

      try {
        if (navigator.onLine) {
          const res = await api.alerts.create(alertData);
          return res.id;
        } else {
          const alertId = crypto.randomUUID();
          await queueSOS({ ...alertData, id: alertId });
          return alertId;
        }
      } catch (error) {
        console.error("SOS creation error:", error);
        const alertId = crypto.randomUUID();
        await queueSOS({ ...alertData, id: alertId });
        return alertId;
      } finally {
        set({ isSending: false });
      }
    },

    subscribeToUserAlerts: (userId) => {
      // Use socket instead of polling/snapshot
      socket.on('alert_update', ({ alert }: { alert: Alert }) => {
        if (alert.residentId === userId) {
          if (alert.status !== 'resolved' && alert.status !== 'cancelled') {
            set({ activeAlert: alert });
          } else {
            set({ activeAlert: null });
          }
        }
      });

      return () => {
        socket.off('alert_update');
      };
    }
  }),
);
