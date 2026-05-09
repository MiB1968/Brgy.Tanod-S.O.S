import { create } from 'zustand';
import { Alert, EmergencyType, AlertStatus } from '../types';
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
      const handleAlertUpdate = (data: any) => {
        const alert = data.alert;

        // Map backend schema to frontend Alert schema
        const formattedAlert: Alert = {
            id: alert.id,
            residentId: alert.resident_id || alert.residentId,
            residentName: alert.residentName || 'Resident',
            type: alert.type as EmergencyType,
            location: typeof alert.location === 'string' ? JSON.parse(alert.location) : alert.location,
            status: alert.status as AlertStatus,
            timestamp: alert.created_at || alert.timestamp || new Date().toISOString()
        };

        if (formattedAlert.residentId === userId) {
          if (formattedAlert.status !== 'resolved' && formattedAlert.status !== 'cancelled') {
            set({ activeAlert: formattedAlert });
          } else {
            set({ activeAlert: null });
          }
        }
      };

      socket.on('alert_update', handleAlertUpdate);

      return () => {
        socket.off('alert_update', handleAlertUpdate);
      };
    }
  }),
);
