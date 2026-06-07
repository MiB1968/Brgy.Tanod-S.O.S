// src/services/sosService.ts
import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { offlineService } from './offlineService';
import { tanodLocationService } from './tanodLocationService';
import { EmergencyType, AlertStatus } from '../types';

export interface SOSReport {
  type: EmergencyType;
  description?: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
    accuracy?: number;
  };
  reportedBy: string;
  reportedByName?: string;
  photos?: string[];
  status?: AlertStatus;
}

export const sosService = {
  async triggerSOS(report: Omit<SOSReport, 'status' | 'timestamp'>) {
    const fullReport: SOSReport = {
      ...report,
      status: 'pending',
    };

    // 1. Save locally first (offline support)
    try {
      const photosAsBlobs: Blob[] = [];
      if (report.photos && report.photos.length > 0) {
        for (const photo of report.photos) {
          try {
            const res = await fetch(photo);
            const blob = await res.blob();
            photosAsBlobs.push(blob);
          } catch (fetchErr) {
            console.error('[SOSService] Failed to convert photo string to blob:', fetchErr);
          }
        }
      }

      await offlineService.queueSOS({
        type: report.type,
        description: report.description || '',
        location: { lat: report.location.lat, lng: report.location.lng },
        timestamp: new Date().toISOString(),
        userId: report.reportedBy,
        userName: report.reportedByName || 'Resident',
        photos: photosAsBlobs,
        smsFallback: true
      });
    } catch (offlineErr) {
      console.error('[SOSService] Failed to queue report locally:', offlineErr);
    }

    try {
      // 2. Try to save to Firestore immediately if online
      const docRef = await addDoc(collection(db, 'alerts'), {
        residentId: fullReport.reportedBy,
        residentName: fullReport.reportedByName || 'Resident',
        type: fullReport.type,
        description: fullReport.description || '',
        location: {
          lat: fullReport.location.lat,
          lng: fullReport.location.lng,
          accuracy: fullReport.location.accuracy || undefined,
        },
        status: 'pending',
        timestamp: serverTimestamp(),
        photos: fullReport.photos || [],
      });

      // 3. Notify nearby Tanods (basic version)
      await this.notifyNearbyTanods(fullReport.location);

      return { success: true, id: docRef.id };
    } catch (error) {
      console.warn('[SOSService] Saved offline. Will sync when connection is active.');
      return { success: false, offline: true };
    }
  },

  async notifyNearbyTanods(location: { lat: number; lng: number }) {
    console.log('[SOSService] Notifying Tanods near:', location);
    // Future expansion: push notifications or custom signaling
  },

  async updateSOSStatus(sosId: string, status: AlertStatus, tanodId?: string, tanodName?: string) {
    try {
      const ref = doc(db, 'alerts', sosId);
      await updateDoc(ref, {
        status,
        updatedAt: serverTimestamp(),
        ...(tanodId && { assignedTo: tanodId }),
        ...(tanodName && { assignedToName: tanodName }),
      });
    } catch (error) {
      console.error('[SOSService] Failed to update SOS status:', error);
      throw error;
    }
  },

  async assignTanodToSOS(sosId: string, tanodId: string, tanodName?: string) {
    try {
      await this.updateSOSStatus(sosId, 'responding', tanodId, tanodName);
      // Update Tanod status in Firestore
      await tanodLocationService.updateTanodStatus(tanodId, 'responding');
    } catch (error) {
      console.error('[SOSService] Failed to assign Tanod to SOS:', error);
      throw error;
    }
  }
};
