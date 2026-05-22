import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "../lib/api";
import { User, Alert, PatrolLocation, EmergencyType } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, 
  Camera, 
  Image as ImageIcon, 
  X,
  Map as MapIcon, 
  Activity, 
  Calendar, 
  Cpu, 
  Settings as SettingsIcon, 
  PhoneCall, 
  Shield,
  Grid,
  Eye
} from "lucide-react";
import { Howl } from "howler";
import { toast } from "react-hot-toast";

// Sub-components
import { ResidentHero } from "./Resident/ResidentHero";
import { SOSGuidance } from './Resident/SOSGuidance';
import { SOSButtonPanel } from "./Resident/SOSButtonPanel";
import { SOSChat } from "./SOSChat";
import { CitizenReportTracker } from "./CitizenReportTracker";
import ActiveMap from "./ActiveMap";
import AboutModal from "./AboutModal";
import { LongPressButton } from "./LongPressButton";

// Stores & hooks
import { useSystemStore } from "../store/useSystemStore";
import { useSOSStore } from "../store/useSOSStore";
import { useShoutDetection } from "../hooks/useShoutDetection";
import { useVideoRecorder } from "../hooks/useVideoRecorder";
import { useOfflineSOS } from "../hooks/useOfflineSOS";
import { useTTS } from "../hooks/useTTS";
import { useEmergencySound } from "../lib/EmergencySoundManager";
import { photoService } from "../services/photoService";
// Unified AI Chat accessible globally via Tactical Dock

import { OfflineVoiceManager } from "./OfflineVoicePackManager";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export default function ResidentDashboard({
  profile,
  patrols,
  visiblePatrols,
  isOnline,
  deferredPrompt,
  onInstall,
  onTabChange,
  sirenActive,
  onToggleSiren,
}: {
  profile: User;
  patrols: PatrolLocation[];
  visiblePatrols: PatrolLocation[];
  isOnline: boolean;
  deferredPrompt: any;
  onInstall: () => void;
  onTabChange: (tab: string) => void;
  sirenActive: boolean;
  onToggleSiren: () => void;
}) {
  const { speak } = useTTS();
  const { triggerEmergency } = useEmergencySound();
  const { setQueuedSOSCount } = useSystemStore();
  const { activeAlert, isSending, createSOS, subscribeToUserAlerts } =
    useSOSStore();
  const { queuedCount, handleQueueSOS, forceSync, isSyncing } = useOfflineSOS();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [guardianMode, setGuardianMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.id && isOnline && !activeAlert) {
      api.generic
        .list(
          `alerts?residentId=${profile.id}&status=pending,responding,active`,
        )
        .then((res) => {
          if (res && res.length > 0) {
            const raw = res[0];
            useSOSStore.getState().setActiveAlert({
              ...raw,
              id: raw.id,
              residentId: raw.resident_id || raw.residentId,
              residentName: raw.residentName || profile.name,
              status: raw.status.toLowerCase(),
              location:
                typeof raw.location === "string"
                  ? JSON.parse(raw.location)
                  : raw.location,
              type: raw.type,
              timestamp: raw.created_at || raw.timestamp,
            });
          }
        })
        .catch(console.error);
    }
  }, [profile?.id, isOnline]);

  useEffect(() => {
    if (profile?.id) {
      const unsubscribe = subscribeToUserAlerts(profile.id);
      return () => unsubscribe();
    }
  }, [profile?.id, subscribeToUserAlerts]);

  // Sync state between hook and system store for legacy compatibility
  useEffect(() => {
    setQueuedSOSCount(queuedCount);
  }, [queuedCount, setQueuedSOSCount]);

  const handleShout = useCallback((reason: string) => {
    toast.error(`GUARDIAN AI: ${reason.toUpperCase()}`, {
      duration: 5000,
      icon: "🛡️",
    });
    handleSOS("OTHER", `Auto-SOS triggered by Guardian AI: ${reason}`);
  }, []);

  const { startListening, stopListening } = useShoutDetection(handleShout);

  const handleVideoChunk = useCallback(
    async (chunk: Blob) => {
      if (!activeAlert?.id) return;
      const service = await import("../services/StorageService");
      await service.uploadVideoChunk(activeAlert.id, chunk, Date.now());
    },
    [activeAlert],
  );

  const { isRecording, startRecording, stopRecording } =
    useVideoRecorder(handleVideoChunk);

  useEffect(() => {
    if (guardianMode) startListening();
    else stopListening();
  }, [guardianMode, startListening, stopListening]);

  useEffect(() => {
    if (!activeAlert && isRecording) stopRecording();
  }, [activeAlert, isRecording, stopRecording]);

  const handleSOS = async (
    type: EmergencyType = "OTHER",
    description: string,
  ) => {
    if (activeAlert || isSending) return;

    // Trigger powerful siren immediately for deterrence
    triggerEmergency(type);

    try {
      let location;
      try {
        const gpsPos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: true,
            timeout: 5000,
          }),
        );
        location = {
          lat: gpsPos.coords.latitude,
          lng: gpsPos.coords.longitude,
        };
      } catch {
        location = { lat: 13.2236, lng: 120.596 };
      }

      // Professional approach: If offline, queue immediately.
      // If online, still queue (Outbox Pattern) and then sync.

      const photosToProcess = [...selectedPhotos];

      if (!isOnline) {
        await handleQueueSOS(type, description, location, photosToProcess);
        setSelectedPhotos([]);
        return;
      }

      // If online, use regular store but with fallback
      try {
        await startRecording();

        // Convert files to base64 for direct online sending
        const b64Photos = await Promise.all(
          photosToProcess.map(async (f) => {
            const blob = await photoService.compressForSOS(f);
            return photoService.blobToBase64(blob);
          }),
        );

        await createSOS(type, description, location, b64Photos);
        setSelectedPhotos([]);
        toast.success("SOS Protocol Initiated. Units alerted.");
      } catch (err) {
        console.warn("Online SOS failed, falling back to outbox queue.");
        await handleQueueSOS(type, description, location, photosToProcess);
        setSelectedPhotos([]);
      }
    } catch (err: any) {
      toast.error("Emergency transmission system failure.");
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-32 tactical-grid min-h-screen p-4 md:p-8"
    >
      <ResidentHero
        profile={profile}
        setIsAboutOpen={setIsAboutOpen}
        guardianMode={guardianMode}
        setGuardianMode={setGuardianMode}
      />

      <AnimatePresence mode="wait">
        {queuedCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-panel border-info/30 bg-info/5 rounded-[32px] p-4 flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-info rounded-xl flex items-center justify-center animate-pulse">
                  <Zap className="text-white w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-black uppercase tracking-widest text-info font-mono">
                    Tactical Outbox Active
                  </h5>
                  <p className="text-[10px] text-white/40 font-bold uppercase font-mono">
                    {queuedCount} SOS {queuedCount === 1 ? "REPORT" : "REPORTS"}{" "}
                    QUEUED FOR SYNC
                  </p>
                </div>
              </div>
              <button
                onClick={forceSync}
                disabled={isSyncing || !isOnline}
                className="flex items-center gap-2 px-6 py-2 bg-info/20 border border-info/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-info hover:bg-info/30 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100"
              >
                {isSyncing
                  ? "SYNCING..."
                  : !isOnline
                    ? "OFFLINE"
                    : "FORCE SYNC NOW"}
              </button>
            </div>
          </motion.div>
        )}

        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-panel border-emergency/50 rounded-[48px] p-8 shadow-glow-red relative overflow-hidden"
          >
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-emergency rounded-[28px] flex items-center justify-center sos-glow">
                  <Zap className="text-white w-10 h-10" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-2xl font-black italic tracking-tighter text-white uppercase font-mono">
                      Emergency Incident Live
                    </h4>
                    <button 
                      onClick={async () => {
                        if (!profile?.id) return;
                        try {
                          const res = await api.generic.list(`alerts?residentId=${profile.id}&status=pending,responding,active`);
                          if (res && res.length > 0) {
                            const raw = res[0];
                            useSOSStore.getState().setActiveAlert({
                              ...raw,
                              id: raw.id,
                              residentId: raw.resident_id || raw.residentId,
                              residentName: raw.residentName || profile.name,
                              status: raw.status.toLowerCase(),
                              location: typeof raw.location === "string" ? JSON.parse(raw.location) : raw.location,
                              type: raw.type,
                              timestamp: raw.created_at || raw.timestamp,
                            });
                            toast.success("STATUS UPDATED");
                          } else {
                            useSOSStore.getState().clearActiveAlert();
                          }
                        } catch (e) {
                          toast.error("REFRESH FAILED");
                        }
                      }}
                      className="p-1 text-white/20 hover:text-white transition-colors"
                      title="Refresh Status"
                    >
                      <Zap className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] font-mono">
                    {activeAlert.status.toUpperCase()} • {activeAlert.type}
                  </p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-4 flex-1 max-w-2xl w-full">
                <div className="flex-1 w-full">
                  <div className="h-2 bg-brand-bg rounded-full overflow-hidden mb-2">
                    <motion.div
                      className="h-full bg-emergency shadow-glow-red"
                      animate={{
                        width:
                          activeAlert.status === "pending"
                            ? "33.33%"
                            : activeAlert.status === "responding"
                              ? "66.66%"
                              : "100%",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-white/20 uppercase tracking-widest">
                    <span>Dispatch</span>
                    <span>En Route</span>
                    <span>On Scene</span>
                  </div>
                </div>

                {activeAlert.status === "resolved" ||
                activeAlert.status === "cancelled" ? (
                  <button
                    onClick={() => {
                      const { clearActiveAlert } = useSOSStore.getState();
                      clearActiveAlert();
                    }}
                    className="px-6 py-3 bg-info/20 border border-info/30 rounded-2xl text-[10px] font-black uppercase tracking-widest text-info hover:bg-info/30 transition-all active:scale-95 whitespace-nowrap relative z-50 cursor-pointer"
                  >
                    Acknowledge
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <LongPressButton
                      onComplete={async () => {
                        try {
                          const { cancelSOS } = useSOSStore.getState();
                          await cancelSOS(activeAlert.id);
                          toast.success("SOS ABORTED SUCCESSFULLY");
                        } catch (err) {
                          toast.error("ABORT FAILED: Please call hotline");
                        }
                      }}
                      text="HOLD TO ABORT"
                      subtext="PRESS & HOLD FOR 3 SECONDS"
                      className="relative z-50"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-8 border-t border-white/5 pt-8">
              <SOSGuidance type={activeAlert.type} />
              <div className="mt-8">
                <SOSChat alertId={activeAlert.id} currentUser={profile} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!activeAlert && (
        <>
          <SOSButtonPanel
            isSending={isSending}
            guardianMode={guardianMode}
            setGuardianMode={setGuardianMode}
            onInitiateSOS={handleSOS}
          />

          {/* Tactical Photo Evidence Area */}
          <div className="max-w-2xl mx-auto mb-12 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 font-mono">
                Tactical Evidence (Max 4)
              </label>
              <button
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase text-white/60 hover:bg-white/10 transition-colors"
              >
                <Camera className="w-3 h-3" />
                Add Image
              </button>
              <input
                type="file"
                ref={photoInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSelectedPhotos((prev) => [...prev, ...files].slice(0, 4));
                }}
              />
            </div>

            {selectedPhotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <AnimatePresence>
                  {selectedPhotos.map((file, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="relative min-w-[120px] h-24 rounded-2xl overflow-hidden border border-white/10 bg-black/40 group"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                        alt="Evidence"
                      />
                      <button
                        onClick={() =>
                          setSelectedPhotos((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-emergency transition-colors backdrop-blur-md"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── CITIZEN CONSOLE GRID ────────── */}
      {onTabChange && (
        <motion.div className="tactical-panel border-tactical-cyan/40 p-5 md:p-6 rounded-[32px] bg-tactical-dark/95 shadow-[0_0_20px_rgba(0,240,255,0.1)] relative overflow-hidden mb-8 max-w-4xl mx-auto w-full">
          <div className="absolute top-0 right-0 w-64 h-64 bg-tactical-cyan/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
            <div>
              <span className="text-[8px] font-black tracking-widest text-tactical-cyan font-mono uppercase">GUARDIAN_PORTAL_MATRIX</span>
              <h3 className="text-sm font-black uppercase tracking-wider font-display text-white mt-0.5 flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-tactical-cyan animate-pulse" />
                CITIZEN GENERAL CONSOLE
              </h3>
            </div>
            <span className="text-[8px] font-mono font-bold text-white/30 tracking-tight uppercase bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
              SECURE SHORTCUT INTERFACES
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { id: "map", label: "Incident Livemap", icon: MapIcon, desc: "Community Incidents", color: "text-tactical-cyan border-tactical-cyan/10 hover:bg-tactical-cyan/5 hover:border-tactical-cyan/40" },
              { id: "tracker", label: "My Active SOS", icon: Activity, desc: "Personal Incident Tracker", color: "text-emerald-400 border-emerald-400/10 hover:bg-emerald-400/5 hover:border-emerald-400/40" },
              { id: "resident-map", label: "Locator Grid", icon: Eye, desc: "Resident GPS Maps", color: "text-purple-400 border-purple-400/10 hover:bg-purple-400/5 hover:border-purple-400/40" },
              { id: "schedule", label: "Patrol Schedules", icon: Calendar, desc: "Tanod Shift Planners", color: "text-indigo-400 border-indigo-400/10 hover:bg-indigo-400/5 hover:border-indigo-400/40" },
              { id: "directory", label: "Emergency Contacts", icon: PhoneCall, desc: "SOS Telephone Directory", color: "text-rose-400 border-rose-400/10 hover:bg-rose-400/5 hover:border-rose-400/40" },
              { id: "guardian", label: "Guardian Sound AI", icon: Cpu, desc: "Aura Noise analysis", color: "text-fuchsia-400 border-fuchsia-400/10 hover:bg-fuchsia-400/5 hover:border-fuchsia-400/40" },
              { id: "settings", label: "My Profile Set", icon: SettingsIcon, desc: "Profile & Configurations", color: "text-slate-400 border-slate-400/10 hover:bg-slate-400/5 hover:border-slate-400/40" }
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
                  <p className="text-[7px] font-bold text-white/30 tracking-tight leading-normal mt-0.5 font-mono truncate">{mod.desc}</p>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <h3 className="text-lg font-black italic tracking-tighter uppercase font-mono">
            Tactical Map Matrix
          </h3>
          <div className="h-[400px] rounded-[32px] overflow-hidden glass-panel border border-white/5 relative">
            <ActiveMap alerts={[]} patrols={visiblePatrols} />
          </div>

          <h3 className="text-lg font-black italic tracking-tighter uppercase font-mono mt-8">
            System Configuration
          </h3>
          <OfflineVoiceManager />
        </div>
        <div className="space-y-8">
          <h3 className="text-lg font-black italic tracking-tighter uppercase font-mono">
            Personal Incident Tracker
          </h3>
          <CitizenReportTracker userId={profile.id} />
        </div>
      </div>

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        role={profile?.role}
      />

      {/* Unified AI Chat accessible globally via Tactical Dock */}
    </motion.div>
  );
}
