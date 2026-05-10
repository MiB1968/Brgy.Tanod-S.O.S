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

    // Save to API
    await api.generic.create('audit_logs', entry);
    socket.emit('audit_log_new', entry);
  } catch (error) {
    console.error('Failed to log incident action:', error);
  }
};
