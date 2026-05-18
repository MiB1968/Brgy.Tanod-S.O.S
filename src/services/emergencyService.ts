import { fetchAPI } from './apiBase';
import { EmergencyType } from '../types';
import { chatService } from './googleWorkspaceService';

export const emergencyService = {
  create: (data: any) => fetchAPI('/sos/alert', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getActiveAlerts: () => fetchAPI('/sos/active'),
  cancelAlert: (id: string) => fetchAPI(`/sos/alert/${id}/cancel`, {
    method: 'POST'
  }),
  updateAlert: (id: string, data: any) => fetchAPI(`/sync`, {
    method: 'POST',
    body: JSON.stringify({ path: `alerts/${id}`, data, options: { merge: true } }),
  }),
  getAll: () => fetchAPI('/sync?path=alerts'),
};

/**
 * Service pattern abstraction for creating emergency reports.
 * Recommended by Technical Audit for zero-delay safety net.
 */
export async function createEmergencyReport(type: EmergencyType, description: string, location?: any) {
  try {
    const report = await emergencyService.create({
      type,
      description,
      location,
      status: 'pending',
      timestamp: new Date().toISOString()
    });

    // Notify Google Chat if configured
    const spaceSetting = localStorage.getItem('brgy_chat_space');
    if (spaceSetting) {
      try {
        await chatService.sendMessage(spaceSetting, 
          `🚨 *EMERGENCY SOS TRIGGERED*\n\n` +
          `*Type:* ${type}\n` +
          `*Description:* ${description}\n` +
          `*Location:* ${location ? `${location.lat}, ${location.lng}` : 'Unknown'}\n` +
          `*Time:* ${new Date().toLocaleString()}\n\n` +
          `_Neural Dispatch System active._`
        );
      } catch (err) {
        console.warn("Failed to notify Google Chat:", err);
      }
    }

    return report;
  } catch (error) {
    console.error("🚨 Service Pattern Error: Failed to save emergency report:", error);
    throw error;
  }
}
