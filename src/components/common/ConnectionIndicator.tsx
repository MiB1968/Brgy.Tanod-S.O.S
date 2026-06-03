import React, { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import socket from "../../lib/socket";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * GuardianForge Connection Indicator
 *
 * Provides a manual and automatic check for tactical link integrity.
 * Crucial for Philippine barangay operations during connectivity drops.
 */
export const ConnectionIndicator: React.FC<{ className?: string }> = ({
  className,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);
  const [isFirebaseLive, setIsFirebaseLive] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnection = async () => {
    setChecking(true);

    // 1. Check Navigator
    setIsOnline(navigator.onLine);

    // 2. Check Socket
    setIsSocketConnected(socket.connected);

    // 3. Check Firebase Reachability
    try {
      // Smallest possible read to check connectivity
      await getDoc(doc(db, "_connection_test_", "ping"));
      setIsFirebaseLive(true);
    } catch (err: any) {
      // Permission denied or other errors often still mean we reached the server
      if (err.code === "permission-denied" || err.code === "not-found") {
        setIsFirebaseLive(true);
      } else {
        setIsFirebaseLive(false);
      }
    }

    setLastCheck(new Date());
    setTimeout(() => setChecking(false), 800);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    socket.on("connect", () => setIsSocketConnected(true));
    socket.on("disconnect", () => setIsSocketConnected(false));

    checkConnection();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  const overallStatus =
    isOnline && isSocketConnected && isFirebaseLive
      ? "optimal"
      : isOnline
      ? "degraded"
      : "offline";

  return (
    <div
      className={cn(
        "bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              overallStatus === "optimal"
                ? "bg-success animate-pulse shadow-[0_0_10px_#22c55e]"
                : overallStatus === "degraded"
                ? "bg-caution animate-bounce shadow-[0_0_10px_#f59e0b]"
                : "bg-emergency animate-ping shadow-[0_0_10px_#ef4444]"
            )}
          />
          <span className="text-[10px] font-black font-mono text-white/40 uppercase tracking-widest">
            Tactical Link Status
          </span>
        </div>

        <button
          onClick={checkConnection}
          disabled={checking}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-90"
        >
          <RefreshCw
            className={cn(
              "w-3 h-3 text-white/30",
              checking && "animate-spin text-info"
            )}
          />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatusPill
          label="NETWORK"
          active={isOnline}
          icon={isOnline ? Wifi : WifiOff}
          color={isOnline ? "text-success" : "text-emergency"}
        />
        <StatusPill
          label="UPLINK"
          active={isSocketConnected}
          icon={isSocketConnected ? CheckCircle2 : AlertTriangle}
          color={isSocketConnected ? "text-info" : "text-caution"}
        />
        <StatusPill
          label="CORE"
          active={isFirebaseLive}
          icon={isFirebaseLive ? ShieldCheck : AlertTriangle}
          color={isFirebaseLive ? "text-success" : "text-emergency"}
        />
      </div>

      {lastCheck && (
        <div className="text-[8px] font-mono text-white/10 uppercase tracking-tighter text-right">
          Last Check: {lastCheck.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

const StatusPill = ({ label, active, icon: Icon, color }: any) => (
  <div className="flex flex-col items-center gap-1.5 p-2 bg-white/[0.02] border border-white/5 rounded-xl">
    <Icon className={cn("w-4 h-4", color)} />
    <span className="text-[7px] font-black font-mono text-white/20 uppercase tracking-tight">
      {label}
    </span>
  </div>
);
