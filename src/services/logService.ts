import * as api from '../lib/api';
import socket from '../lib/socket';
import { AuditLogEntry } from '../types/auditLog';
import { Alert } from '../types';
import { db } from '../db/offlineDB';

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

    // Save with real-time offline local queues
    if (navigator.onLine) {
      try {
        await api.generic.create('audit_logs', entry);
        socket.emit('audit_log_new', entry);
      } catch (err) {
        console.warn('[LogService] Online dispatch failed, queuing to local storage:', err);
        await db.queuedActions.add({
          type: 'activity_log',
          payload: { path: 'audit_logs', entry },
          timestamp: Date.now(),
          retryCount: 0
        });
      }
    } else {
      console.warn('[LogService] Client offline, queuing incident log in outbox.');
      await db.queuedActions.add({
        type: 'activity_log',
        payload: { path: 'audit_logs', entry },
        timestamp: Date.now(),
        retryCount: 0
      });
    }
  } catch (error) {
    console.error('Failed to log incident action:', error);
  }
};

export const logTanodActivity = async (activityLog: {
  tanod_id: string;
  tanod_name: string;
  type: string;
  details: string;
  location?: { lat: number; lng: number };
}) => {
  try {
    const entry = {
      ...activityLog,
      timestamp: new Date().toISOString(),
    };

    if (navigator.onLine) {
      try {
        await api.logs.create(entry);
      } catch (err) {
        console.warn('[LogService] Online tanod log failed, queuing to local storage:', err);
        await db.queuedActions.add({
          type: 'activity_log',
          payload: { path: 'tanod_activity_logs', entry },
          timestamp: Date.now(),
          retryCount: 0
        });
      }
    } else {
      console.warn('[LogService] Client offline, queueing tanod activity log.');
      await db.queuedActions.add({
        type: 'activity_log',
        payload: { path: 'tanod_activity_logs', entry },
        timestamp: Date.now(),
        retryCount: 0
      });
    }
  } catch (error) {
    console.error('Failed in logTanodActivity handler:', error);
  }
};
