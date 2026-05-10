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
  cancelSOS: (id: string) => Promise<void>;
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
        description,
        aiAnalysis
      };

      try {
        let finalAlertId;
        if (navigator.onLine) {
          const res = await api.alerts.create(alertData);
          finalAlertId = res.id;
        } else {
          finalAlertId = crypto.randomUUID();
          await queueSOS({ ...alertData, id: finalAlertId });
        }
        
        // Optimistic update
        set({ activeAlert: { ...alertData, id: finalAlertId } });
        return finalAlertId;
      } catch (error) {
        console.error("SOS creation error:", error);
        const alertId = crypto.randomUUID();
        await queueSOS({ ...alertData, id: alertId });
        set({ activeAlert: { ...alertData, id: alertId } });
        return alertId;
      } finally {
        set({ isSending: false });
      }
    },

    cancelSOS: async (id) => {
      try {
        await api.alerts.cancel(id);
        set({ activeAlert: null });
      } catch (error) {
        console.error("SOS cancel error:", error);
        throw error;
      }
    },

    subscribeToUserAlerts: (userId) => {
      const handleAlert = (data: any) => {
        const rawAlert = data.alert || data;
        if (!rawAlert || !rawAlert.id) return;

        // Normalize fields from DB format to Store format
        const normalizedAlert: Alert = {
          ...rawAlert,
          id: rawAlert.id,
          residentId: rawAlert.resident_id || rawAlert.residentId,
          residentName: rawAlert.residentName || 'Resident',
          location: typeof rawAlert.location === 'string' ? JSON.parse(rawAlert.location) : rawAlert.location,
          timestamp: rawAlert.created_at || rawAlert.timestamp
        };

        if (normalizedAlert.residentId === userId) {
          if (normalizedAlert.status !== 'resolved' && normalizedAlert.status !== 'cancelled') {
            set({ activeAlert: normalizedAlert });
          } else if (normalizedAlert.status === 'resolved' || normalizedAlert.status === 'cancelled') {
            set({ activeAlert: null });
          }
        }
      };

      socket.on('alert_new', handleAlert);
      socket.on('alert_update', handleAlert);

      return () => {
        socket.off('alert_new', handleAlert);
        socket.off('alert_update', handleAlert);
      };
    }
  }),
);
