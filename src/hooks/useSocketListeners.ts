import { useEffect } from 'react';
import socket from '../lib/socket';
import { useIncidentStore } from '../store/useIncidentStore';
import { useTanodStore } from '../store/useTanodStore';
import { 
  User, 
  Alert, 
  AlertStatus, 
  EmergencyType, 
  PatrolLocation,
  SystemBroadcast
} from '../types';
import { toast } from 'react-hot-toast';

export function useSocketListeners(
  profile: User | null, 
  effectiveRole: string,
  setActiveBroadcast: (b: SystemBroadcast | null) => void,
  setGlobalSirenActive: (active: boolean) => void,
  setIsShaking: (shaking: boolean) => void,
  setActiveTab: (tab: any) => void
) {
  const { addAlert } = useIncidentStore();
  const { updatePatrol, updateTanodStatus } = useTanodStore();

  useEffect(() => {
    if (!profile) {
      if (socket.connected) socket.disconnect();
      return;
    }

    // Explicitly connect when profile is available
    if (!socket.connected) {
      console.log('[Socket] Initiating authenticated connection...');
      socket.connect();
    }

    const showSOSNotification = (alert: Alert) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`🚨 SOS EMERGENCY: ${alert.type}`, {
          body: `Resident: ${alert.residentName}\nLocation tracked. Tactical units notified.`,
          icon: '/sos-icon.png',
          tag: alert.id,
          requireInteraction: true,
          silent: false
        });

        notification.onclick = () => {
          window.focus();
          setActiveTab('tracker');
          notification.close();
        };
      }
    };

    const handleAlert = (data: any) => {
      const alert = data.alert || data; // Handle both alert_new and alert_update structures
      if (!alert) return;
      
      const formattedAlert: Alert = {
        id: alert.id,
        residentId: alert.resident_id || alert.residentId,
        residentName: alert.residentName || 'Resident',
        type: alert.type as EmergencyType,
        location: typeof alert.location === 'string' ? JSON.parse(alert.location) : alert.location,
        status: (alert.status as string).toLowerCase() as AlertStatus,
        timestamp: alert.created_at || alert.timestamp || new Date().toISOString()
      };
      
      addAlert(formattedAlert);
      
      if (profile.role === 'admin' || profile.role === 'tanod' || effectiveRole === 'superadmin') {
        // Either it's a new alert or status is pending/PENDING
        // We can just check the lowercase status.
        if (formattedAlert.status.toLowerCase() === 'pending') {
          toast.error(`🚨 SOS EMERGENCY: ${formattedAlert.type}`, { duration: 10000, id: `sos-${formattedAlert.id}` });
          showSOSNotification(formattedAlert);
        }
      }
      
      if (profile.role === 'resident' && formattedAlert.residentId === profile.id) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        toast.success(`SOS Update: ${formattedAlert.status}`, { id: `res-sos-${formattedAlert.id}` });
      }
    };

    socket.on('alert_new', handleAlert);
    socket.on('alert_update', handleAlert);

    socket.on('location_map', (activeLocations: any) => {
      const patrolsToSet: PatrolLocation[] = Object.values(activeLocations).map((loc: any) => ({
        id: loc.user_id,
        tanodId: loc.user_id,
        tanodName: loc.name || 'Active Responder',
        location: { lat: loc.lat, lng: loc.lng },
        isActive: true,
        status: loc.status || 'patrolling',
        lastUpdate: loc.timestamp || new Date().toISOString()
      }));
      useTanodStore.getState().setPatrols(patrolsToSet);
    });

    socket.on('location_update_delta', (loc: any) => {
      updatePatrol({
        id: loc.user_id,
        tanodId: loc.user_id,
        tanodName: loc.name || 'Active Responder',
        location: { lat: loc.lat, lng: loc.lng },
        isActive: true,
        status: loc.status || 'patrolling',
        lastUpdate: loc.timestamp || new Date().toISOString()
      });
    });

    socket.on('location_update_batch', (deltas: any[]) => {
      deltas.forEach(loc => {
        updatePatrol({
          id: loc.user_id,
          tanodId: loc.user_id,
          tanodName: loc.name || 'Active Responder',
          location: { lat: loc.lat, lng: loc.lng },
          isActive: true,
          status: loc.status || 'patrolling',
          lastUpdate: loc.timestamp || new Date().toISOString()
        });
      });
    });

    socket.on('location_remove_delta', (data: { user_id: string }) => {
      // Mark patrol as inactive or remove it from list
      useTanodStore.getState().setPatrols((prev) => prev.filter(p => p.tanodId !== data.user_id));
    });

    socket.on('patrol_update', (update: any) => {
       const patrol: PatrolLocation = {
         id: update.tanodId || update.tanod_id,
         tanodId: update.tanodId || update.tanod_id,
         tanodName: update.tanodName || update.tanod_name || 'Active Tanod',
         location: typeof update.location === 'string' ? JSON.parse(update.location) : update.location,
         isActive: update.isActive ?? update.is_active,
         status: (update.isActive ?? update.is_active) ? (update.status || 'patrolling') : 'offline',
         lastUpdate: new Date().toISOString()
       };
       
       updatePatrol(patrol);
    });

    socket.on('patrol_location', (data: any) => {
      updatePatrol({
        tanodId: data.tanodId,
        isActive: true,
        ...data
      } as PatrolLocation);
    });

    socket.on('broadcast_update', (broadcast: any) => {
      if (broadcast.isActive) {
        setActiveBroadcast(broadcast);
      } else {
        setActiveBroadcast(null);
      }
    });

    socket.on('tanod_update', (update: any) => {
      if (update.id && update.status) {
        updateTanodStatus(update.id, update.status);
      }
    });

    socket.on('resident_update', (update: any) => {
       // Optional: Update resident status in local store if needed
    });

    socket.on('siren_update', (data: any) => {
      setGlobalSirenActive(data?.sirenActive || false);
      if (data?.sirenActive) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 2000);
      }
    });

    return () => {
      socket.off('alert_new', handleAlert);
      socket.off('alert_update', handleAlert);
      socket.off('location_map');
      socket.off('location_update_delta');
      socket.off('location_update_batch');
      socket.off('location_remove_delta');
      socket.off('patrol_update');
      socket.off('patrol_location');
      socket.off('broadcast_update');
      socket.off('tanod_update');
      socket.off('resident_update');
      socket.off('siren_update');
      
      console.log('[Socket] Cleaning up listeners and disconnecting...');
      socket.disconnect();
    };
  }, [profile, effectiveRole, addAlert, updatePatrol, updateTanodStatus, setActiveBroadcast, setGlobalSirenActive, setIsShaking, setActiveTab]);
}
