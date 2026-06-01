import { useState, useEffect } from "react";
import * as api from "../lib/api";
import socket from "../lib/socket";
import { Alert, User, SystemBroadcast, RegistryStatus } from "../types";
import { 
  Shield, 
  Map as MapIcon, 
  Activity, 
  Calendar, 
  Cpu, 
  Settings as SettingsIcon, 
  PhoneCall, 
  AlertOctagon,
  Eye,
  Grid
} from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import LiveMap from "../LiveMap";
import { subscribeToTanodTopic } from "../lib/notifications";

// Sub-components
import { TanodPortalHeader } from "./Tanod/TanodPortalHeader";
import { TanodAlertsFeed } from "./Tanod/TanodAlertsFeed";
import { StatusTogglePanel } from "./Tanod/StatusTogglePanel";
import { TacticalCard } from "./Tactical/TacticalCard";
import { PoliceLights } from "./PoliceLights";
import TanodPerformance from "./TanodPerformance";
import AboutModal from "./AboutModal";
import { AlertDetailsModal } from "./AlertDetailsModal";
import IncidentForm from "./IncidentForm";

// Stores & Hooks
import { useIncidentStore } from "../store/useIncidentStore";
import { useTanodStore } from "../store/useTanodStore";
import { logIncidentAction } from "../services/logService";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export default function TanodDashboard({
  profile,
  deferredPrompt,
  onInstall,
  sirenActive,
  onToggleSiren,
  onTabChange,
}: {
  profile: User | null;
  deferredPrompt?: any;
  onInstall?: () => void;
  sirenActive: boolean;
  onToggleSiren: () => void;
  onTabChange?: (tab: string) => void;
}) {
  const { alerts } = useIncidentStore();
  const { patrols, updateTanodStatus } = useTanodStore();
  const [isFlashing, setIsFlashing] = useState(false);
  const [selectedAlertForDetails, setSelectedAlertForDetails] =
    useState<Alert | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    // Subscribe to push notifications if using PWA or mobile
    if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          subscribeToTanodTopic(profile.id);
        }
      });
    }

    const hasActive = alerts.some((a) =>
      ["pending", "active"].includes(a.status?.toLowerCase() || ""),
    );
    setIsFlashing(hasActive || sirenActive);
  }, [alerts, profile, sirenActive]);

  const handleUpdateStatus = async (alert: Alert, status: Alert["status"]) => {
    try {
      const updateData: any = { status, updatedAt: new Date().toISOString() };

      if (status === "responding") {
        updateData.respondedBy = profile?.id;
        updateData.respondedByName = profile?.name;
        updateData.respondedAt = new Date().toISOString();
      }

      if (status === "resolved") {
        updateData.resolvedAt = new Date().toISOString();
        updateData.resolutionNotes = `Resolved by Responder ${profile?.name}`;

        try {
          await api.incidents.create({
            alertId: alert.id,
            tanodId: profile?.id,
            tanodName: profile?.name || "Unknown",
            citizenName: alert.residentName || "Resident",
            timestamp: new Date().toISOString(),
            location: alert.description || "GPS Response",
            type: alert.type,
            description: `Resolved SOS Alert from ${alert.residentName}.\nResolution note: ${updateData.resolutionNotes}`,
            status: "resolved",
          });
        } catch (incidentError) {
          console.warn(
            "Failed to create incident log, but continuing to resolve SOS",
            incidentError,
          );
        }
      }

      await api.alerts.updateAlert(alert.id, updateData);

      if (profile?.id) {
        const isOnline =
          ["responding"].includes(status.toLowerCase()) ||
          (["resolved", "cancelled"].includes(status.toLowerCase()) &&
            profile.status === "approved");

        await api.generic.update(`users/${profile.id}`, {
          status:
            status === "responding"
              ? "Responding"
              : profile.status || "approved",
          activeAlertId: status === "responding" ? alert.id : null,
        });
      }

      await logIncidentAction({ ...alert, ...updateData });
      toast.success(`Operational Status: ${status.toUpperCase()}`);
    } catch (error: any) {
      const errorMessage =
        error?.message || typeof error === "string"
          ? error
          : JSON.stringify(error) || "Unknown error occurred";
      toast.error(`Fault: ${errorMessage}`);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 text-zinc-400 bg-tactical-dark">
        <div className="text-center">
          <div className="animate-pulse w-12 h-12 border-2 border-tactical-cyan/20 rounded-full mx-auto mb-4" />
          <p className="text-[10px] font-mono uppercase tracking-widest text-tactical-cyan">Synchronizing Responder Uplink...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 md:space-y-8 pb-20 tactical-grid min-h-screen p-4 md:p-8 bg-tactical-dark"
    >
      <PoliceLights active={isFlashing} />

      <TanodPortalHeader
        profile={profile}
        setIsReportFormOpen={setIsReportFormOpen}
        setIsAboutOpen={setIsAboutOpen}
      />

      {deferredPrompt && (
        <motion.button
          onClick={onInstall}
          className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-[32px] bg-tactical-cyan/10 text-tactical-cyan font-black border border-tactical-cyan/30 hover:bg-tactical-cyan/20 mb-4 transition-all hover:scale-[1.01] uppercase font-mono shadow-[0_0_15px_var(--color-tactical-cyan)]"
        >
          📲 INSTALL TANOD MOBILE APP
        </motion.button>
      )}

      <StatusTogglePanel
        profile={profile}
        sirenActive={sirenActive}
        onToggleSiren={onToggleSiren}
        updateTanodStatus={updateTanodStatus}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT COMPONENT - ALERTS FEED */}
        <div className="w-full lg:w-96 flex-shrink-0">
          <TanodAlertsFeed
            alerts={alerts}
            profile={profile}
            onUpdateStatus={handleUpdateStatus}
            onDetails={setSelectedAlertForDetails}
          />
        </div>

        {/* CENTER COMPONENT - MAP HUB */}
        <div className="flex-1 w-full space-y-6">
          <motion.div className="w-full h-[600px] rounded-[32px] border border-tactical-cyan/10 overflow-hidden relative shadow-2xl">
            <LiveMap effectiveRole={profile?.role} />
          </motion.div>

          {/* ── TACTICAL CONSOLE GRID ────────── */}
          {onTabChange && (
            <motion.div className="tactical-panel border-tactical-cyan/20 p-5 md:p-6 rounded-[32px] bg-tactical-dark/95 shadow-[0_0_20px_rgba(0,240,255,0.05)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-tactical-cyan/5 blur-[80px] rounded-full pointer-events-none" />
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div>
                  <span className="text-[8px] font-black tracking-widest text-tactical-cyan font-mono uppercase">PATROL_HUD_MATRIX</span>
                  <h3 className="text-sm font-black uppercase tracking-wider font-display text-white mt-0.5 flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-tactical-cyan animate-pulse" />
                    TACTICAL RESPONDER GRID
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {[
                  { id: "map", label: "Intel Livemap", icon: MapIcon, desc: "Community Grid", color: "text-tactical-cyan border-tactical-cyan/10 hover:bg-tactical-cyan/5 hover:border-tactical-cyan/40" },
                  { id: "tracker", label: "Tactical Tracker", icon: Activity, desc: "GPS Live Units", color: "text-emerald-400 border-emerald-400/10 hover:bg-emerald-400/5 hover:border-emerald-400/40" },
                  { id: "roster", label: "Tanod Units", icon: Shield, desc: "Active Forces", color: "text-blue-400 border-blue-400/10 hover:bg-blue-400/5 hover:border-blue-400/40" },
                  { id: "schedule", label: "Shift Schedule", icon: Calendar, desc: "Planning", color: "text-indigo-400 border-indigo-400/10 hover:bg-indigo-400/5 hover:border-indigo-400/40" },
                  { id: "reports", label: "Threat Feeds", icon: AlertOctagon, desc: "Broadcasts", color: "text-tactical-red border-tactical-red/10 hover:bg-tactical-red/5 hover:border-tactical-red/40" },
                  { id: "directory", label: "Hotlines", icon: PhoneCall, desc: "Channels", color: "text-rose-400 border-rose-400/10 hover:bg-rose-400/5 hover:border-rose-400/40" },
                  { id: "guardian", label: "Guardian AI", icon: Cpu, desc: "Sound analysis", color: "text-fuchsia-400 border-fuchsia-400/10 hover:bg-fuchsia-400/5 hover:border-fuchsia-400/40" },
                  { id: "settings", label: "Profile", icon: SettingsIcon, desc: "Configs", color: "text-slate-400 border-slate-400/10 hover:bg-slate-400/5 hover:border-slate-400/40" }
                ].map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => onTabChange(mod.id)}
                      className={`flex flex-col text-left p-3 rounded-2xl border bg-black/40 transition-all active:scale-95 duration-300 hover:scale-[1.03] hover:shadow-md select-none group cursor-pointer ${mod.color}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-1.5 ml-0 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                          <Icon className="w-4 h-4 text-white/70 group-hover:text-white" />
                        </div>
                      </div>
                      <h4 className="text-[10px] font-black uppercase font-mono tracking-wider italic text-white/90 leading-tight group-hover:text-white transition-colors">{mod.label}</h4>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* RIGHT COMPONENT - PERFORMANCE & SUMMARY */}
        <div className="w-full lg:w-80 space-y-6 flex-shrink-0">
          <TacticalCard title="Unit Force Stats">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-tactical-dark rounded-2xl border border-tactical-cyan/20">
                <span className="text-[11px] font-bold text-white/60 font-mono">
                  ACTIVE_PATROL
                </span>
                <span className="text-xl font-black text-tactical-cyan font-mono">
                  {patrols.filter((p) => p.isActive && p.status === "patrolling").length}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-tactical-dark rounded-2xl border border-tactical-cyan/20">
                <span className="text-[11px] font-bold text-white/60 font-mono">
                  ACTIVE_RESPONSE
                </span>
                <span className="text-xl font-black text-tactical-red font-mono">
                  {patrols.filter((p) => p.isActive && p.status === "responding").length}
                </span>
              </div>
            </div>
          </TacticalCard>

          <TanodPerformance />
        </div>
      </div>

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        role={profile?.role}
      />
      <AnimatePresence>
        {isReportFormOpen && profile && (
          <IncidentForm
            userRole={profile.role}
            onClose={() => setIsReportFormOpen(false)}
            onSubmit={(data) => { console.log(data); }}
          />
        )}
      </AnimatePresence>
      {selectedAlertForDetails && (
        <AlertDetailsModal
          alert={selectedAlertForDetails}
          onClose={() => setSelectedAlertForDetails(null)}
        />
      )}
    </motion.div>
  );
}
