// src/hooks/useSocketListeners.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "react-hot-toast";
import { auth } from "../lib/firebase";

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
  const socketRef = useRef<Socket | null>(null);

  const { addAlert, updateAlert, setAlerts } = useIncidentStore();
  const { updatePatrol, setPatrols } = useTanodStore();
  const { setIsOnline, triggerSync } = useSystemStore();
  // const { addUserAlert } = useSOSStore(); // Assuming this store doesn't exist based on earlier code, safely ignoring unless needed

  useEffect(() => {
    if (!effectiveProfile?.id) return;

    let socket: Socket | null = null;
    let isActive = true;

    const connectSocket = async () => {
      let token = "";
      if (auth.currentUser) {
        try {
          token = await auth.currentUser.getIdToken();
        } catch (e) {
          console.warn("Failed to get Firebase token for socket:", e);
        }
      } else {
        token = localStorage.getItem('token') || ""; 
      }

      if (!isActive) return;

      socket = io(
        import.meta.env.VITE_SOCKET_URL || window.location.origin,
        {
          auth: {
            token,
            userId: effectiveProfile.id,
            role: effectiveRole,
            name: effectiveProfile.name,
          },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          path: "/socket.io",
        }
      );

      socketRef.current = socket;

      // ── Connection Events ─────────────────────────────────────
      socket.on("connect", () => {
        console.log("✅ Socket Connected:", socket.id);
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

    socket.on("disconnect", () => {
      console.log("❌ Socket Disconnected");
      setIsOnline(false);
    });

    // ── Real-time Alerts ─────────────────────────────────────
    socket.on("new_alert", (alert: Alert) => {
      addAlert(alert);

      if (["admin", "superadmin", "tanod"].includes(effectiveRole)) {
        setActiveTab("home");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 2000);

        toast.error(`🚨 New SOS Alert: ${alert.type}`, {
          duration: 8000,
          position: "top-center",
        });
      }
    });

    socket.on("alert_updated", (updatedAlert: Alert) => {
      updateAlert(updatedAlert.id, updatedAlert);

      if (updatedAlert.residentId === effectiveProfile.id) {
        toast.success(`Alert Status: ${updatedAlert.status}`, {
          icon: updatedAlert.status === "resolved" ? "✅" : "🚨",
        });
      }
    });

    // ── Tanod / Patrol Tracking ───────────────────────────────
    socket.on("patrol_update", (patrolData: any) => {
      updatePatrol(patrolData);
    });

    socket.on("tanod_status", (data: any) => {
      if (["admin", "superadmin"].includes(effectiveRole)) {
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
    
    // Call connect Socket inside useEffect
    };
    
    connectSocket();

    // Cleanup on unmount
    return () => {
      isActive = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
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

  // Manual emit helpers (optional but useful)
  const emitSOS = (alertData: Partial<Alert>) => {
    if (socketRef.current) {
      socketRef.current.emit("send_sos", alertData);
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
    if (socketRef.current && (effectiveRole === "tanod" || effectiveRole === "superadmin")) {
      socketRef.current.emit("location_update", locationData);
    }
  };

  return {
    socket: socketRef.current,
    emitSOS,
    emitLocationUpdate,
  };
}
