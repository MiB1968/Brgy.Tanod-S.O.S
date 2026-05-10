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
    if (!profile) return;

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

    socket.on('alert_update', (data: any) => {
      const alert = data.alert;
      if (!alert) return;
      
      const formattedAlert: Alert = {
        id: alert.id,
        residentId: alert.resident_id || alert.residentId,
        residentName: alert.residentName || 'Resident',
        type: alert.type as EmergencyType,
        location: typeof alert.location === 'string' ? JSON.parse(alert.location) : alert.location,
        status: alert.status as AlertStatus,
        timestamp: alert.created_at || alert.timestamp || new Date().toISOString()
      };
      
      addAlert(formattedAlert);
      
      if (profile.role === 'admin' || profile.role === 'tanod' || effectiveRole === 'superadmin') {
        toast.error(`NEW SOS ALERT: ${formattedAlert.type}`, { duration: 10000 });
        if (formattedAlert.status === 'pending') {
          showSOSNotification(formattedAlert);
        }
      }
      
      if (profile.role === 'resident' && formattedAlert.residentId === profile.id) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(200);
        }
        toast.success(`SOS Update: ${formattedAlert.status}`);
      }
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
      if (update.status) {
        updateTanodStatus(update.id, update.status);
      }
    });

    socket.on('siren_update', (data: any) => {
      setGlobalSirenActive(data?.sirenActive || false);
      if (data?.sirenActive) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 2000);
      }
    });

    return () => {
      socket.off('alert_update');
      socket.off('patrol_update');
      socket.off('patrol_location');
      socket.off('broadcast_update');
      socket.off('tanod_update');
      socket.off('siren_update');
    };
  }, [profile, effectiveRole, addAlert, updatePatrol, updateTanodStatus, setActiveBroadcast, setGlobalSirenActive, setIsShaking, setActiveTab]);
}
