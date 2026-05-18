import { useState, useEffect } from "react";
import * as api from "../lib/api";
import socket from "../lib/socket";
import { Alert, User, SystemBroadcast, RegistryStatus } from "../types";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import LiveMap from "../LiveMap";

// Sub-components
import { TanodPortalHeader } from "./Tanod/TanodPortalHeader";
import { TanodAlertsFeed } from "./Tanod/TanodAlertsFeed";
import { StatusTogglePanel } from "./Tanod/StatusTogglePanel";
import { TacticalCard } from "./Tactical/TacticalCard";
import { PoliceLights } from "./PoliceLights";
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
}: {
  profile: User | null;
  deferredPrompt?: any;
  onInstall?: () => void;
  sirenActive: boolean;
  onToggleSiren: () => void;
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

      <motion.div className="w-full h-[600px] rounded-[32px] overflow-hidden tactical-panel border border-tactical-cyan/25 relative shadow-2xl">
        <LiveMap effectiveRole={profile?.role} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <TanodAlertsFeed
          alerts={alerts}
          profile={profile}
          onUpdateStatus={handleUpdateStatus}
          onDetails={setSelectedAlertForDetails}
        />

        <div className="lg:col-span-1 space-y-6 md:space-y-8">
          {/* Units Summary */}
          <TacticalCard title="Force Status Summary">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-tactical-dark rounded-2xl border border-tactical-cyan/20">
                <span className="text-[11px] font-bold text-white/60 font-mono">
                  ON_PATROL
                </span>
                <span className="text-xl font-black text-tactical-cyan font-mono">
                  {
                    patrols.filter(
                      (p) => p.isActive && p.status === "patrolling",
                    ).length
                  }
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-tactical-dark rounded-2xl border border-tactical-cyan/20">
                <span className="text-[11px] font-bold text-white/60 font-mono">
                  RESPONDING
                </span>
                <span className="text-xl font-black text-tactical-red font-mono">
                  {
                    patrols.filter(
                      (p) => p.isActive && p.status === "responding",
                    ).length
                  }
                </span>
              </div>
            </div>
          </TacticalCard>
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
            profile={profile}
            onClose={() => setIsReportFormOpen(false)}
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
