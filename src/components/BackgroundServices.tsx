import { useEffect } from 'react';
import { doc, setDoc, collection, onSnapshot, query, where, orderBy, addDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useIncidentStore } from '../store/useIncidentStore';
import { useTanodStore } from '../store/useTanodStore';
import { useLogStore } from '../store/useLogStore';
import { watchLocation } from '../lib/gps';
import { flushSOSQueue, getQueueSize } from '../lib/offlineQueue';
import { useSystemStore } from '../store/useSystemStore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Alert, PatrolLocation, Shift, TanodProfile } from '../types';
import { scheduleDailyLogReset } from '../lib/scheduler';
import toast from 'react-hot-toast';

export default function BackgroundServices() {
  const { profile } = useAuthStore();
  const { setAlerts, addAlert, removeAlert, updateAlertStatus } = useIncidentStore();
  const { setPatrols, setShifts, setActivityLogs, setPatrolSessions } = useTanodStore();
  const { clearActiveLogs } = useLogStore();
  const { isOnline, setIsOnline, setQueuedSOSCount, lastSyncTime } = useSystemStore();

    // 2. Supabase Real-time Listener (The "Tactical Command" Feed)
    useEffect(() => {
      if (!isSupabaseConfigured) {
        console.warn('⚡ Tactical Link: Delayed - Supabase credentials not set in environment.');
        return;
      }

      console.log('📡 Initializing Tactical Live Link...');
      let isMounted = true;
      let tacticalChannel: any = null;

      // Connection Test: Try a simple REST fetch to see if URL/Key are valid BEFORE connecting Websocket
      supabase.from('report_logs').select('id').limit(1).then(({ error }) => {
        if (!isMounted) return;
        if (error) {
          console.error('❌ Supabase Connection Test Failed:', error.message);
          if (error.message.includes('Invalid API key') || error.code === '401') {
            console.warn('👉 FIX: Your VITE_SUPABASE_ANON_KEY is invalid.');
            console.warn('👉 SOLUTION: Go to Supabase > Settings > API. Copy the "Publishable key" (anon/public).');
            console.warn('👉 IMPORTANT: Ensure you pasted it into AI Studio Settings without quotes.');
            toast.error('❌ Supabase Configuration Error: Invalid API Key. Check AI Studio Settings (Gear Icon).', { duration: 10000 });
          }
          if (error.message.includes('FetchError') || error.message.includes('failed to fetch')) {
            console.warn('HINT: This usually means VITE_SUPABASE_URL is unreachable. Check for typos or leading/trailing spaces.');
            toast.error('❌ Supabase Error: Could not connect to Supabase URL. Check your settings.', { duration: 10000 });
          }
          return; // STOP: Do not connect Realtime if REST fails
        }

        tacticalChannel = supabase
          .channel(`tactical-command-${Math.random().toString(36).substring(2)}`)
          .subscribe((status, err: any) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Tactical Live Link: ACTIVE');
            } else if (status === 'CHANNEL_ERROR') {
              const transportError = err?.message?.includes('transport failure') || !err;
              const is1006 = err?.message?.includes('1006') || err?.code === 1006 || String(err).includes('1006');
              const isNormalClosure = err?.message?.includes('1000') || err?.code === 1000 || String(err).includes('1000');
              
              if (isNormalClosure) {
                console.log('📡 Tactical Link: Connection closed normally (1000).');
              } else if (is1006) {
                console.warn(`⏳ Tactical Link reconnecting (1006)...`);
              } else {
                console.error(`❌ Tactical Link Error (CHANNEL_ERROR):`, err);
              }
              
              if (transportError && !isNormalClosure) {
                console.warn('💡 TROUBLESHOOTING "transport failure":');
                console.warn('1. API KEY: Ensure you are using the "Publishable/anon" key, NOT the "service_role" key.');
                console.warn('2. URL: Ensure VITE_SUPABASE_URL starts with https:// and has NO trailing slash.');
                console.warn('3. REALTIME: Ensure Realtime is enabled for the tables in Supabase Dashboard (Database > Replication).');
                console.warn('👉 Use the Publishable key from Supabase Dashboard > Settings > API.');
              } else {
                console.warn('HINT: Check if "report_logs" and "tanods" tables are in the "supabase_realtime" publication.');
              }
            } else if (status === 'TIMED_OUT') {
              console.warn('⏳ Tactical Link: TIMED_OUT. Retrying in background...');
            }
          });
      });

      return () => {
        isMounted = false;
        if (tacticalChannel) {
          supabase.removeChannel(tacticalChannel);
        }
      };
    }, [addAlert, removeAlert, setPatrols]);

  // 2. Tanod Location heartbeat (Sync to Supabase maps via WebSocket Broadcast)
  useEffect(() => {
    if (!isSupabaseConfigured || profile?.role !== 'tanod' || !auth?.currentUser) return;

    // Establishing the tactical broadcast channel
    const gpsChannel = supabase.channel('tanod-gps-updates');

    const pushLocation = async () => {
      // Respect Privacy: Check if location sharing is enabled
      if ((profile as TanodProfile)?.isLocationSharingEnabled === false) {
        console.log('📡 Tactical Link: Privacy Shield ACTIVE (GPS Sharing Disabled)');
        return;
      }

      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 })
        );

        const locationData = {
          id: auth?.currentUser?.uid,
          name: profile.name,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          status: 'On-Duty',
          updated_at: new Date().toISOString()
        };

        // Real-time broadcast via WebSocket
        gpsChannel.send({
          type: 'broadcast',
          event: 'location_update',
          payload: locationData
        });

        // Persistent update in Database (for retrospective/initial map load)
        await supabase.from('tanods').upsert([{
          ...locationData,
          location_lat: locationData.lat,
          location_lng: locationData.lng
        }]);
      } catch (err) {
        console.warn('Supabase GPS update failed:', err);
      }
    };

    pushLocation();
    const interval = setInterval(pushLocation, 15000); // Increased frequency to 15s for better "real-time" feel
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(gpsChannel);
    };
  }, [profile]);

  // 2.5 Handle Privacy Toggle: If sharing is disabled, mark patrol as inactive immediately
  useEffect(() => {
    if (!profile || profile.role !== 'tanod' || !db) return;
    
    const updateActivity = async () => {
      if ((profile as any).isLocationSharingEnabled === false) {
        console.log('📡 Tactical Link: Privacy Shield DEPLOYED. Suspending GPS broadcasts.');
        try {
          await setDoc(doc(db, 'patrols', profile.uid), { 
            isActive: false,
            status: 'offline' 
          }, { merge: true });
        } catch (e) {
          console.error('Failed to update patrol status during privacy toggle', e);
        }
      }
    };

    updateActivity();
  }, [profile?.uid, (profile as any)?.isLocationSharingEnabled]);

  // 3. Daily Log Reset Listener (Supabase Broadcast + Mock Scheduler Fallback)
  useEffect(() => {
    let mockCleanup = () => {};
    let channel: any = null;

    if (isSupabaseConfigured) {
      channel = supabase
        .channel(`system-events-${Math.random().toString(36).substring(2)}`)
        .on('broadcast', { event: 'logs_reset' }, (payload) => {
          console.log('Daily Log Reset Signal Received:', payload);
          clearActiveLogs();
          toast('📋 Daily Log Archived & Reset — 07:00 AM Cycle Complete', {
            duration: 8000,
            icon: '📋'
          });
        })
        .subscribe((status, err: any) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Supabase Real-time: Connected (System Events)');
          } else if (status === 'CHANNEL_ERROR') {
            const is1006 = err?.message?.includes('1006') || err?.code === 1006 || String(err).includes('1006');
            const isNormalClosure = err?.message?.includes('1000') || err?.code === 1000 || String(err).includes('1000');
            
            if (isNormalClosure) {
              console.log('📡 Supabase Real-time: Connection closed normally (1000/System Events).');
            } else if (!is1006) {
              console.error('❌ Supabase Real-time Error (System Events):', err);
            }
          }
        });
    }

    // 2.2 Local Mock Scheduler (Fallback for local dev if Edge Function isn't running)
    mockCleanup = scheduleDailyLogReset((date) => {
      console.log(`[LOCAL_RESET] Mock Daily Reset triggered for ${date}`);
      clearActiveLogs();
      toast.success(`📋 Local Audit Cycle Logged — 07:00 AM (${date})`, {
        icon: '📊'
      });
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      mockCleanup();
    };
  }, [clearActiveLogs]);

  // 3. Real-time Listeners (Firestore)
  useEffect(() => {
    if (!profile || !db) return;

    // A. Alerts Listener
    const alertsQ = profile.role === 'admin' || profile.role === 'superadmin' || profile.role === 'tanod'
      ? query(collection(db, 'alerts'), orderBy('timestamp', 'desc'))
      : query(collection(db, 'alerts'), where('residentId', '==', profile.uid), orderBy('timestamp', 'desc'));

    const unsubAlerts = onSnapshot(alertsQ, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Alert));
      setAlerts(list);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'alerts'));

    // B. Patrols Listener (Admin/Tanod only)
    let unsubPatrols = () => {};
    if (profile.role === 'admin' || profile.role === 'superadmin' || profile.role === 'tanod') {
      const patrolsQ = query(collection(db, 'patrols'));
      unsubPatrols = onSnapshot(patrolsQ, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PatrolLocation));
        setPatrols(list);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'patrols'));
    }

    // C. Shifts Listener (Relevant to profile)
    const shiftsQ = query(collection(db, 'shifts'));
    const unsubShifts = onSnapshot(shiftsQ, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
      setShifts(list);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'shifts'));

    // D. Tanod Activity Logs Listener (Admin/SuperAdmin only)
    let unsubActivity = () => {};
    if (profile.role === 'admin' || profile.role === 'superadmin') {
      const activityQ = query(collection(db, 'tanod_activity_logs'), orderBy('timestamp', 'desc'));
      unsubActivity = onSnapshot(activityQ, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setActivityLogs(list);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'tanod_activity_logs'));
    }

    // E. Patrol Sessions Listener (Admin/SuperAdmin only)
    let unsubSessions = () => {};
    if (profile.role === 'admin' || profile.role === 'superadmin') {
      const sessionsQ = query(collection(db, 'patrol_sessions'), orderBy('startTime', 'desc'));
      unsubSessions = onSnapshot(sessionsQ, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setPatrolSessions(list);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'patrol_sessions'));
    }

    return () => {
      unsubAlerts();
      unsubPatrols();
      unsubShifts();
      unsubActivity();
      unsubSessions();
    };
  }, [profile]);

  // 2. Continuous GPS Tracking for Tanods & Patrol Route Recording
  useEffect(() => {
    if (!profile || profile.role !== 'tanod' || !auth?.currentUser || !db) return;

    let sessionStartTime = new Date().toISOString();
    const sessionId = `session_${profile.uid}_${new Date().getTime()}`;

    // Start a new session in Firestore
    const startSession = async () => {
      try {
        await setDoc(doc(db, 'patrol_sessions', sessionId), {
          id: sessionId,
          tanodId: profile.uid,
          tanodName: profile.name,
          startTime: sessionStartTime,
          route: []
        });
        
        // Log duty start
        await addDoc(collection(db, 'tanod_activity_logs'), {
          tanodId: profile.uid,
          tanodName: profile.name,
          type: 'duty_start',
          timestamp: sessionStartTime,
          details: 'Tanod went on duty and started patrol session.'
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `patrol_sessions/${sessionId}`);
      }
    };

    startSession();

    let lastLoggedTime = 0;
    const stopWatching = watchLocation(async (loc) => {
      // Respect Privacy
      if ((profile as TanodProfile)?.isLocationSharingEnabled === false) return;

      try {
        const now = new Date().getTime();
        
        // Update active patrol status
        const isSharing = (profile as TanodProfile).isLocationSharingEnabled !== false;
        
        // Determine Tactical Status
        const currentAlerts = useIncidentStore.getState().alerts;
        const isResponding = currentAlerts.some(a => 
          (a.assignedTo === profile.uid || a.respondedBy === profile.uid) && 
          (a.status === 'responding' || a.status === 'pending')
        );

        const tacticalStatus = !isSharing ? 'offline' : (isResponding ? 'responding' : 'patrolling');
        
        await setDoc(doc(db, 'patrols', profile.uid), {
          tanodId: profile.uid,
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
        }, { merge: true });

        // Log route point every 2 minutes or if distance is significant (simplified to 2 mins here)
        if (now - lastLoggedTime > 120000) {
          lastLoggedTime = now;
          const timestamp = new Date().toISOString();
          
          // Use arrayUnion to append to the route
          const { arrayUnion } = await import('firebase/firestore');
          await setDoc(doc(db, 'patrol_sessions', sessionId), {
            route: arrayUnion({
              lat: loc.lat,
              lng: loc.lng,
              timestamp
            })
          }, { merge: true });

          // Also log a patrol marker activity
          await addDoc(collection(db, 'tanod_activity_logs'), {
            tanodId: profile.uid,
            tanodName: profile.name,
            type: 'patrol_marker',
            timestamp,
            location: { lat: loc.lat, lng: loc.lng },
            details: `Patrol marker recorded at ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `patrols/${profile.uid}`);
      }
    }, (err) => {
      console.warn('GPS tracking error:', err.message);
    });

    return () => {
      stopWatching();
      if (auth?.currentUser) {
        const endTime = new Date().toISOString();
        setDoc(doc(db, 'patrols', profile.uid), { isActive: false }, { merge: true });
        setDoc(doc(db, 'patrol_sessions', sessionId), { endTime }, { merge: true });
        
        // Log duty end
        addDoc(collection(db, 'tanod_activity_logs'), {
          tanodId: profile.uid,
          tanodName: profile.name,
          type: 'duty_end',
          timestamp: endTime,
          details: 'Tanod went offline/duty ended.'
        });
      }
    };
  }, [profile]);

  // 3. Offline Sync (Flush Queue)
  useEffect(() => {
    if (!db) return;
    
    const syncQueue = async () => {
      const size = await getQueueSize();
      setQueuedSOSCount(size);

      if (isOnline && size > 0) {
        toast.loading(`Syncing ${size} queued SOS alerts...`, { id: 'sync-sos' });
        try {
          await flushSOSQueue(async (data) => {
            if (data.id) {
              await setDoc(doc(db, 'alerts', data.id), data);
            } else {
              await addDoc(collection(db, 'alerts'), data);
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

    // Periodically check queue size even if offline status doesn't change
    const interval = setInterval(syncQueue, 10000);
    
    // Sync immediately when coming online
    if (isOnline) syncQueue();

    return () => clearInterval(interval);
  }, [isOnline, setQueuedSOSCount, lastSyncTime]);

  return null;
}
