import { useEffect } from "react";
import socket from "../lib/socket";
import { useTanodStore } from "../store/useTanodStore";
import { useIncidentStore } from "../store/useIncidentStore";
import { SystemBroadcast, Alert, PatrolLocation } from "../types";

export const useRealtimeData = (
  user: any,
  setActiveBroadcast: (b: SystemBroadcast | null) => void,
  setGlobalSirenActive: (a: boolean) => void,
) => {
  const { setAlerts, addAlert } = useIncidentStore();
  const { setPatrols, updatePatrol } = useTanodStore();

  useEffect(() => {
    if (!user) return;

    const handleSiren = (data: any) => {
      setGlobalSirenActive(data?.sirenActive || false);
    };

    const handleAlert = (payload: any) => {
      const alert = payload?.alert || payload;
      if (alert && alert.id) {
        addAlert(alert);
      }
    };

    const handlePatrol = (patrol: any) => {
      if (patrol.id) {
        updatePatrol(patrol);
      }
    };

    socket.on("siren_update", handleSiren);
    socket.on("alert_update", handleAlert);
    socket.on("patrol_update", handlePatrol);

    return () => {
      socket.off("siren_update", handleSiren);
      socket.off("alert_update", handleAlert);
      socket.off("patrol_update", handlePatrol);
    };
  }, [user, addAlert, setAlerts, setPatrols, setGlobalSirenActive]);
};
