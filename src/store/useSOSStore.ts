import { create } from 'zustand';
import { Alert, EmergencyType } from '../types';
import * as api from '../lib/api';
import socket from '../lib/socket';
import { offlineService } from '../services/offlineService';
import * as safeStorage from '../lib/safeStorage';

interface SOSState {
  activeAlert: Alert | null;
  isSending: boolean;
  setActiveAlert: (alert: Alert | null) => void;
  createSOS: (type: EmergencyType, description: string, location: { lat: number, lng: number }, photos?: string[]) => Promise<string | null>;
  cancelSOS: (id: string) => Promise<void>;
  subscribeToUserAlerts: (userId: string) => () => void;
}

export const useSOSStore = create<SOSState>()(
  (set, get) => ({
    activeAlert: null,
    isSending: false,
    setActiveAlert: (alert) => set({ activeAlert: alert }),
    
    createSOS: async (type, description, location, photos = []) => {
      set({ isSending: true });
      const storedUser = safeStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      const alertData: any = {
        residentId: user?.id || 'anonymous',
        residentName: user?.name || 'Unknown Resident',
        type,
        location,
        status: 'pending',
        timestamp: new Date().toISOString(),
        description,
        photos,
        clientUuid: crypto.randomUUID()
      };

      try {
        let finalAlertId;
        // If we are online, try to send to API
        if (navigator.onLine) {
          try {
            const res = await api.alerts.create(alertData);
            finalAlertId = res.id;
            set({ activeAlert: { ...alertData, id: finalAlertId } });
            return finalAlertId;
          } catch (apiError) {
            console.warn("[SOS] API call failed, falling back to outbox queue", apiError);
            throw apiError;
          }
        } else {
          // Explicitly offline
          throw new Error('OFFLINE_MODE');
        }
      } catch (error) {
        console.warn("[SOS] Queuing report due to connection failure");
        const tempId = crypto.randomUUID();
        
        // Add to professional outbox
        const photoBlobs = await Promise.all(
          photos.map(async (p) => {
            const res = await fetch(p);
            return await res.blob();
          })
        );

        // Map older generic 'type' string to new restricted enum type, defaulting to 'other'
        let mappedType: 'emergency' | 'medical' | 'fire' | 'crime' | 'other' = 'other';
        if (['emergency', 'medical', 'fire', 'crime'].includes(type)) {
          mappedType = type as 'emergency' | 'medical' | 'fire' | 'crime';
        }

        await offlineService.queueSOS({
          userId: user?.id || 'anonymous',
          latitude: location.lat,
          longitude: location.lng,
          type: mappedType,
          priority: 'high',
          description,
          mediaUrls: [],
        }, photoBlobs);

        // Optimistic update for UI tracking
        set({ activeAlert: { ...alertData, id: tempId, isOfflineQueued: true } });
        return tempId;
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
          status: (rawAlert.status || '').toLowerCase() as any,
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
