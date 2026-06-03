// src/hooks/useSocketListeners.ts
import { useEffect } from "react";
import { toast } from "react-hot-toast";
import socket from "../lib/socket";

import { useIncidentStore } from "../store/useIncidentStore";
import { useTanodStore } from "../store/useTanodStore";
import { useSystemStore } from "../store/useSystemStore";
// import { useSOSStore } from "../store/useSOSStore";

import type { SystemBroadcast, Alert, User } from "../types"; // Adjusted imports based on what actually exists

interface UseSocketListenersProps {
  effectiveProfile: User | null;
  effectiveRole: string;
  setActiveBroadcast: (broadcast: SystemBroadcast | null) => void;
  setGlobalSirenActive: (active: boolean) => void;
  setIsShaking: (shaking: boolean) => void;
  setActiveTab: (tab: any) => void;
}

export function useSocketListeners({
  effectiveProfile,
  effectiveRole,
  setActiveBroadcast,
  setGlobalSirenActive,
  setIsShaking,
  setActiveTab,
}: UseSocketListenersProps) {
  const { addAlert, updateAlert } = useIncidentStore();
  const { updatePatrol } = useTanodStore();
  const { setIsOnline, triggerSync } = useSystemStore();

  useEffect(() => {
    if (!effectiveProfile?.id) return;

    // Use shared singleton socket
    // Auth is already handled by AuthContext and socket.ts (setting token)
    
    // ── Connection Events ─────────────────────────────────────
    socket.on("connect", () => {
      console.log("✅ Socket Connected with ID:", socket.id);
      setIsOnline(true);
      toast.success("Connected to Command Center", {
        icon: "🔗",
        id: "socket-connect",
      });
      socket.emit("register", {
        userId: effectiveProfile.id,
        role: effectiveRole,
      });
    });

    if (socket.connected) {
      console.log("✅ Socket Already Connected, Registering:", socket.id, "with role", effectiveRole);
      socket.emit("register", {
        userId: effectiveProfile.id,
        role: effectiveRole,
      });
    }

    socket.on("disconnect", () => {
      console.log("❌ Socket Disconnected");
      setIsOnline(false);
    });

    // Helper to sanitize and normalize payload fields to fit frontend types (e.g. residentId, parsed location object)
    const normalizeAlert = (rawAlert: any): Alert => {
      if (!rawAlert) return rawAlert;
      return {
        ...rawAlert,
        id: rawAlert.id,
        status: (rawAlert.status || "").toLowerCase() as any,
        residentId: rawAlert.resident_id || rawAlert.residentId,
        residentName: rawAlert.residentName || "Resident",
        location:
          typeof rawAlert.location === "string"
            ? JSON.parse(rawAlert.location)
            : rawAlert.location,
        aiAnalysis: 
          rawAlert.aiAnalysis || 
          (typeof rawAlert.ai_analysis === "string" 
            ? JSON.parse(rawAlert.ai_analysis) 
            : rawAlert.ai_analysis),
        timestamp: rawAlert.created_at || rawAlert.timestamp || new Date().toISOString(),
      };
    };

    // ── Real-time Alerts ─────────────────────────────────────
    socket.on("alert_update", (payload: any) => {
      const rawAlert = payload?.alert || payload;
      if (!rawAlert) return;
      const alert = normalizeAlert(rawAlert);
      const type = payload?.type || 'new';

      if (type === 'new' || !payload.type) {
        addAlert(alert);

        if (["admin", "super_admin", "tanod"].includes(effectiveRole)) {
          setActiveTab("home");
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 2000);

          toast.error(`🚨 New SOS Alert: ${alert.type}`, {
            duration: 8000,
            position: "top-center",
          });
        }
      } else if (type === 'update') {
        updateAlert(alert.id, alert);

        if (alert.residentId === effectiveProfile.id) {
          toast.success(`Alert Status: ${alert.status}`, {
            icon: alert.status === "resolved" ? "✅" : "🚨",
          });
        }
      }
    });

    socket.on("new_alert", (rawAlert: any) => {
      if (!rawAlert) return;
      const alert = normalizeAlert(rawAlert);
      addAlert(alert);
      if (["admin", "super_admin", "tanod"].includes(effectiveRole)) {
        setActiveTab("home");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 2000);
        toast.error(`🚨 New SOS Alert: ${alert.type}`, { duration: 8000, position: "top-center" });
      }
    });

    socket.on("alert_updated", (rawAlert: any) => {
      if (!rawAlert) return;
      const alert = normalizeAlert(rawAlert);
      updateAlert(alert.id, alert);
      if (alert.residentId === effectiveProfile.id) {
        toast.success(`Alert Status: ${alert.status}`, {
          icon: alert.status === "resolved" ? "✅" : "🚨",
        });
      }
    });

    // ── Tanod / Patrol Tracking ───────────────────────────────
    socket.on("patrol_update", (patrolData: any) => {
      updatePatrol(patrolData);
    });

    socket.on("tanod_status", (data: any) => {
      if (["admin", "super_admin"].includes(effectiveRole)) {
        toast(`${data.name} is now ${data.status}`, { icon: "ℹ️" });
      }
    });

    // ── Broadcasts ────────────────────────────────────────────
    socket.on("broadcast", (broadcast: SystemBroadcast) => {
      setActiveBroadcast(broadcast);

      if (broadcast.type === "emergency") {
        setGlobalSirenActive(true);
        setTimeout(() => setGlobalSirenActive(false), 15000);
      }

      toast(broadcast.message, {
        icon: broadcast.type === "emergency" ? "🚨" : "📢",
        duration: 12000,
      });
    });

    // ── Global Siren ──────────────────────────────────────────
    socket.on("global_siren", (data: { active: boolean; message?: string }) => {
      setGlobalSirenActive(data.active);

      if (data.active) {
        toast.error(data.message || "🚨 GLOBAL EMERGENCY SIREN ACTIVATED", {
          duration: 10000,
        });
      }
    });

    // ── System Messages ───────────────────────────────────────
    socket.on("system_message", (data: { type: string; message: string }) => {
      if (data.type === "success") toast.success(data.message);
      else if (data.type === "error") toast.error(data.message);
      else toast(data.message);
    });

    // ── Force Sync Request ────────────────────────────────────
    socket.on("force_sync", () => {
      triggerSync();
      toast("🔄 Server requested full sync...");
    });

    // Cleanup listeners on unmount (but don't disconnect singleton!)
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("alert_update");
      socket.off("new_alert");
      socket.off("alert_updated");
      socket.off("patrol_update");
      socket.off("tanod_status");
      socket.off("broadcast");
      socket.off("global_siren");
      socket.off("system_message");
      socket.off("force_sync");
    };
  }, [
    effectiveProfile?.id,
    effectiveRole,
    addAlert,
    updateAlert,
    updatePatrol,
    setIsOnline,
    triggerSync,
    setActiveBroadcast,
    setGlobalSirenActive,
    setIsShaking,
    setActiveTab,
  ]);

  // Manual emit helpers
  const emitSOS = (alertData: Partial<Alert>) => {
    if (socket.connected) {
      socket.emit("send_sos", alertData);
    }
  };

  const emitLocationUpdate = (locationData: {
    tanodId: string;
    tanodName?: string;
    location: { lat: number; lng: number; accuracy?: number };
    speed?: number;
    heading?: number;
    timestamp: number;
    isActive: boolean;
    batteryLevel?: number;
  }) => {
    if (socket.connected && (effectiveRole === "tanod" || effectiveRole === "super_admin")) {
      socket.emit("location_update", locationData);
    }
  };

  return {
    socket,
    emitSOS,
    emitLocationUpdate,
  };
}
