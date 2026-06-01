import { create } from "zustand";
import { Alert, EmergencyType } from "../types";
import * as api from "../lib/api";
import socket from "../lib/socket";
import { offlineService } from "../services/offlineService";
import * as safeStorage from "../lib/safeStorage";

interface SOSState {
  activeAlert: Alert | null;
  isSending: boolean;
  setActiveAlert: (alert: Alert | null) => void;
  createSOS: (
    type: EmergencyType,
    description: string,
    location: { lat: number; lng: number },
    photos?: string[],
    clientUuid?: string,
    isOfflineRecovered?: boolean
  ) => Promise<string | null>;
  cancelSOS: (id: string) => Promise<void>;
  clearActiveAlert: () => void;
  subscribeToUserAlerts: (userId: string) => () => void;
}

export const useSOSStore = create<SOSState>()((set, get) => ({
  activeAlert: null,
  isSending: false,
  setActiveAlert: (alert) => set({ activeAlert: alert }),

  createSOS: async (type, description, location, photos = [], clientUuid?: string, isOfflineRecovered?: boolean) => {
    set({ isSending: true });
    const storedUser = safeStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const finalClientUuid = clientUuid || crypto.randomUUID();

    const alertData: any = {
      residentId: user?.id || "anonymous",
      residentName: user?.name || "Unknown Resident",
      type,
      location,
      status: "pending",
      timestamp: new Date().toISOString(),
      description,
      photos,
      clientUuid: finalClientUuid,
      isOfflineRecovered,
    };

    try {
      let finalAlertId;
      // If we are online, try to send to API
      if (navigator.onLine) {
        try {
          const res = await api.alerts.create(alertData);
          if (res && res.success === false) {
            if (res.error?.code === 'DUPLICATE') {
               console.warn('[SOS] Duplicate report ignored by server.');
               set({ isSending: false });
               return null;
            }
            throw new Error(res.error?.message || 'Server rejected SOS');
          }
          finalAlertId = res.data ? res.data.id : res.id;
          set({ activeAlert: { ...alertData, id: finalAlertId } });
          return finalAlertId;
        } catch (apiError: any) {
          const msg = apiError?.message || '';
          if (msg.includes('System busy') || msg.includes('Duplicate')) {
             console.warn('[SOS] Refusing to queue due to rate limit/duplicate:', msg);
             set({ isSending: false });
             throw apiError; 
          }
          console.warn("[SOS] API call failed, falling back to outbox queue", apiError);
          // Only re-throw if it came from sync (already has a clientUuid provided initially)
          if (clientUuid) throw apiError;
        }
      } else {
        // Explicitly offline
        if (clientUuid) throw new Error("OFFLINE_MODE");
      }
    } catch (error) {
      if (clientUuid) throw error; // Let sync orchestrator handle logic

      console.warn("[SOS] Queuing report due to connection failure");
      const tempId = crypto.randomUUID();

      // Add to professional outbox
      const photoBlobs = await Promise.all(
        photos.map(async (p) => {
          const res = await fetch(p);
          return await res.blob();
        }),
      );

      await offlineService.queueSOS({
        type,
        description,
        location,
        timestamp: alertData.timestamp,
        userId: user?.id || "anonymous",
        userName: user?.name || "Resident",
        photos: photoBlobs,
        clientUuid: finalClientUuid,
        smsFallback: true
      });

      // Optimistic update for UI tracking
      set({ activeAlert: { ...alertData, id: tempId, isOfflineQueued: true } });
      return tempId;
    } finally {
      set({ isSending: false });
    }
  },

  cancelSOS: async (id) => {
    try {
      await api.alerts.cancelAlert(id);
      set({ activeAlert: null });
    } catch (error) {
      console.error("SOS cancel error:", error);
      throw error;
    }
  },

  clearActiveAlert: () => set({ activeAlert: null }),

  subscribeToUserAlerts: (userId) => {
    const handleAlert = (data: any) => {
      const rawAlert = data.alert || data;
      if (!rawAlert || !rawAlert.id) return;

      // Normalize fields from DB format to Store format
      const normalizedAlert: Alert = {
        ...rawAlert,
        id: rawAlert.id,
        status: (rawAlert.status || "").toLowerCase() as any,
        residentId: rawAlert.resident_id || rawAlert.residentId,
        residentName: rawAlert.residentName || "Resident",
        location:
          typeof rawAlert.location === "string"
            ? JSON.parse(rawAlert.location)
            : rawAlert.location,
        aiAnalysis: 
          rawAlert.aiAnalysis || 
          (typeof rawAlert.ai_analysis === "string" 
            ? JSON.parse(rawAlert.ai_analysis) 
            : rawAlert.ai_analysis),
        timestamp: rawAlert.created_at || rawAlert.timestamp,
      };

      if (normalizedAlert.residentId === userId) {
        // Always set the active alert so the UI can show the active/resolved status
        // The user will dismiss it manually.
        set({ activeAlert: normalizedAlert });
      }
    };

    socket.on("alert_new", handleAlert);
    socket.on("alert_update", handleAlert);

    return () => {
      socket.off("alert_new", handleAlert);
      socket.off("alert_update", handleAlert);
    };
  },
}));
