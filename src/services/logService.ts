import * as api from '../lib/api';
import socket from '../lib/socket';
import { AuditLogEntry } from '../types/auditLog';
import { Alert } from '../types';

export const logIncidentAction = async (alert: Alert, actionNotes?: string) => {
  try {
    const entry: Partial<AuditLogEntry> = {
      incident_id: alert.id,
      type: alert.type as any,
      status: alert.status as any,
      citizen_id: alert.residentId,
      tanod_assigned: alert.respondedBy || alert.assignedTo,
      location_lat: alert.location.lat,
      location_lng: alert.location.lng,
      created_at: new Date().toISOString(),
      notes: actionNotes || alert.resolutionNotes
    };

    // 1. Save to API
    await api.generic.create('audit_logs', entry);
    socket.emit('audit_log_new', entry);

    // 2. Save to Central Server DB (Sync for Daily Audit Log system)
    try {
      await api.generic.update(`report_logs/${alert.id}`, {
        id: alert.id,
        incident_id: alert.id,
        type: alert.type,
        status: alert.status,
        tanod_assigned: entry.tanod_assigned,
        location_lat: alert.location.lat,
        location_lng: alert.location.lng,
        lat: alert.location.lat,
        lng: alert.location.lng
      });
    } catch (dbErr) {
      console.error('Report Log sync failed:', dbErr);
    }
  } catch (error) {
    console.error('Failed to log incident action:', error);
  }
};
