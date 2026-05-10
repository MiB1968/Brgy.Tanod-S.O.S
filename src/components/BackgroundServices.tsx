import { useEffect, useRef } from 'react';
import * as api from '../lib/api';
import socket from '../lib/socket';
import { useAuthStore } from '../store/useAuthStore';
import { useIncidentStore } from '../store/useIncidentStore';
import { useTanodStore } from '../store/useTanodStore';
import { useLogStore } from '../store/useLogStore';
import { watchLocation } from '../lib/gps';
import { flushSOSQueue, getQueueSize } from '../lib/offlineQueue';
import { useSystemStore } from '../store/useSystemStore';
import { Alert, PatrolLocation, TanodProfile, User } from '../types';
import { scheduleDailyLogReset } from '../lib/scheduler';
import { withRetry } from '../lib/utils';
import toast from 'react-hot-toast';

export default function BackgroundServices() {
  const { profile } = useAuthStore();
  const { setAlerts, addAlert } = useIncidentStore();
  const { setPatrols, updatePatrol, setShifts, setActivityLogs, setPatrolSessions, setTanods } = useTanodStore();
  const { clearActiveLogs } = useLogStore();
  const { isOnline, setQueuedSOSCount, lastSyncTime } = useSystemStore();

  const isInitialLoadDone = useRef(false);

  // 1. Data Listeners (WebSockets)
  useEffect(() => {
    if (!profile) {
      isInitialLoadDone.current = false;
      return;
    }

    // A. Initial Load with Retry
    const loadInitialData = async () => {
      try {
        console.log("[SYSTEM] Starting optimized initial load...");
        
        const [alertsData, patrolsData, shiftsData, tanodsData] = await withRetry(() => Promise.all([
          api.alerts.getAll(),
          api.generic.list('patrols'),
          api.generic.list('shifts'),
          api.generic.list('users?role=tanod')
        ]));
        
        setAlerts(alertsData);
        setPatrols(patrolsData);
        setShifts(shiftsData);
        setTanods(tanodsData);

        if (profile.role === 'admin' || profile.role === 'superadmin') {
          const [logsData, sessionsData] = await withRetry(() => Promise.all([
            api.logs.getAll(),
            api.generic.list('patrol_sessions')
          ]));
          setActivityLogs(logsData);
          setPatrolSessions(sessionsData);
        }
        
        isInitialLoadDone.current = true;
      } catch (err) {
        console.error("Critical: Initial load failed after retries.", err);
        toast.error("Network instability detected. Some data may be stale.", { id: 'load-error' });
      }
    };

    if (!isInitialLoadDone.current) {
      loadInitialData();
    }

    // B. Real-time updates - AVOID FULL REFRESHES
    // We already have useSocketListeners for granular updates.
    // BackgroundServices should only handle "meta" events or admin-specific re-syncs.
    
    const handleSyncEvent = () => {
      // Use a debounced or scheduled minor refresh if really needed, 
      // but granular is better. For now, let's just listen to log events
      // which aren't handled by granular listeners.
      if (profile.role === 'admin' || profile.role === 'superadmin') {
        withRetry(() => api.logs.getAll()).then(setActivityLogs).catch(() => {});
      }
    };

    socket.on('log_new', handleSyncEvent);
    socket.on('broadcast_update', loadInitialData); // Broadcasts are rare, full refresh is okay
    
    // Note: alert_update and patrol_update are handled by useSocketListeners.tsx
    // We REMOVED the loadInitialData triggers from here to prevent racing.

    return () => {
      socket.off('log_new', handleSyncEvent);
      socket.off('broadcast_update', loadInitialData);
    };
  }, [profile, setAlerts, setPatrols, setShifts, setActivityLogs, setPatrolSessions, setTanods]);

  // 2. Tanod Location Heartbeat & Patrol Route Recording
  useEffect(() => {
    if (!profile || profile.role !== 'tanod') return;

    let sessionStartTime = new Date().toISOString();
    const sessionId = `session_${profile.id}_${new Date().getTime()}`;

    // Start a new session
    const startSession = async () => {
      try {
        await api.generic.create('patrol_sessions', {
          id: sessionId,
          tanodId: profile.id,
          tanodName: profile.name,
          startTime: sessionStartTime,
          route: []
        });
        
        // Log duty start
        await api.logs.create({
          tanodId: profile.id,
          tanodName: profile.name,
          type: 'duty_start',
          timestamp: sessionStartTime,
          details: 'Tanod went on duty and started patrol session.'
        });
      } catch (err) {
        console.error("Failed to start patrol session", err);
      }
    };

    startSession();

    let lastLoggedTime = 0;
    const stopWatching = watchLocation(async (loc) => {
      // Respect Privacy
      if ((profile as TanodProfile)?.isLocationSharingEnabled === false) return;

      try {
        const now = new Date().getTime();
        const isSharing = (profile as TanodProfile).isLocationSharingEnabled !== false;
        
        // Determine Tactical Status
        const currentAlerts = useIncidentStore.getState().alerts;
        const isResponding = currentAlerts.some(a => 
          (a.assignedTo === profile.id || a.respondedBy === profile.id) && 
          (a.status === 'responding' || a.status === 'pending')
        );

        const tacticalStatus = !isSharing ? 'offline' : (isResponding ? 'responding' : 'patrolling');
        
        // Update active patrol status via API
        await api.generic.update(`patrols/${profile.id}`, {
          tanodId: profile.id,
          tanodName: profile.name,
          location: {
            lat: loc.lat,
            lng: loc.lng,
            accuracy: loc.accuracy
          },
          isActive: isSharing,
          status: tacticalStatus,
          isLocationSharingEnabled: isSharing,
          lastUpdate: new Date().toISOString()
        });

        // Broadcast to other clients
        socket.emit('patrol_location', {
          tanodId: profile.id,
          tanodName: profile.name,
          location: loc,
          isActive: true,
          status: tacticalStatus
        });

        // Log route point every 2 minutes
        if (now - lastLoggedTime > 120000) {
          lastLoggedTime = now;
          const timestamp = new Date().toISOString();
          
          // Append logic: Fetch current session and update
          try {
            const session = await api.generic.get(`patrol_sessions/${sessionId}`);
            const updatedRoute = [...(session.route || []), { lat: loc.lat, lng: loc.lng, timestamp }];
            await api.generic.update(`patrol_sessions/${sessionId}`, {
              route: updatedRoute
            });
          } catch (e) {
            console.error("Failed to update patrol route", e);
          }

          // Also log a patrol marker activity
          await api.logs.create({
            tanodId: profile.id,
            tanodName: profile.name,
            type: 'patrol_marker',
            timestamp,
            location: { lat: loc.lat, lng: loc.lng },
            details: `Patrol marker recorded at ${loc.lat ? loc.lat.toFixed(4) : 'N/A'}, ${loc.lng ? loc.lng.toFixed(4) : 'N/A'}`
          });
        }
      } catch (err) {
        console.error("GPS update error in BackgroundServices", err);
      }
    }, (err) => {
      console.warn('GPS tracking error:', err.message);
    });

    return () => {
      stopWatching();
      const endTime = new Date().toISOString();
      api.generic.update(`patrols/${profile.id}`, { isActive: false });
      api.generic.update(`patrol_sessions/${sessionId}`, { endTime });
      api.logs.create({
        tanodId: profile.id,
        tanodName: profile.name,
        type: 'duty_end',
        timestamp: endTime,
        details: 'Tanod went offline/duty ended.'
      });
    };
  }, [profile]);

  // 3. Daily Log Reset Listener
  useEffect(() => {
    const cleanup = scheduleDailyLogReset((date) => {
      console.log(`[LOCAL_RESET] Daily Reset triggered for ${date}`);
      clearActiveLogs();
      toast.success(`📋 Audit Cycle Logged — 07:00 AM (${date})`, {
        icon: '📊'
      });
    });

    return () => cleanup();
  }, [clearActiveLogs]);

  // 4. Offline Sync (Flush Queue)
  useEffect(() => {
    const syncQueue = async () => {
      const size = await getQueueSize();
      setQueuedSOSCount(size);

      if (isOnline && size > 0) {
        toast.loading(`Syncing ${size} queued SOS alerts...`, { id: 'sync-sos' });
        try {
          await flushSOSQueue(async (data) => {
            // Sanitize: replace customMessage with description if present
            const sanitizedData = { ...data };
            if (sanitizedData.customMessage && !sanitizedData.description) {
               sanitizedData.description = sanitizedData.customMessage;
               delete sanitizedData.customMessage;
            }
            try {
              await api.alerts.create(sanitizedData);
            } catch (err: any) {
              if (err.message?.includes("You already have an active SOS alert")) {
                console.warn("Discarding queued SOS because one is already active:", err);
                return; // Discard it by returning successfully
              }
              throw err;
            }
          });
          
          const remaining = await getQueueSize();
          setQueuedSOSCount(remaining);
          
          if (remaining === 0) {
            toast.success('Offline alerts synchronized successfully!', { id: 'sync-sos', icon: '📡' });
          } else {
            toast.error(`Sync partially failed. ${remaining} alerts still queued.`, { id: 'sync-sos' });
          }
        } catch (err) {
          console.error('Sync failed:', err);
          toast.error('Sync failed. Will retry later.', { id: 'sync-sos' });
        }
      }
    };

    const interval = setInterval(syncQueue, 30000);
    if (isOnline) syncQueue();

    return () => clearInterval(interval);
  }, [isOnline, setQueuedSOSCount, lastSyncTime]);

  return null;
}
