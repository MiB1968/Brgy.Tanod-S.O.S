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
  Eye,
  BookOpen,
} from "lucide-react";
import { Howl } from "howler";
import { toast } from "react-hot-toast";

// Sub-components
import { ResidentHero } from "./Resident/ResidentHero";
import { SOSGuidance } from "./Resident/SOSGuidance";
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
import { triageEmergency } from "../services/webllmTriage";
import { isWebLLMReady } from "../lib/webllm";
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
          `alerts?residentId=${profile.id}&status=pending,responding,active`
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

  const handleSOS = async (
    type: EmergencyType = "OTHER",
    description: string
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
          })
        );
        location = {
          lat: gpsPos.coords.latitude,
          lng: gpsPos.coords.longitude,
        };
      } catch {
        location = { lat: 14.5995, lng: 120.9842 };
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
          })
        );

        const alertId = await createSOS(type, description, location, b64Photos);
        setSelectedPhotos([]);
        toast.success("SOS Protocol Initiated. Units alerted.");
        runTriage(alertId, type, description);
      } catch (err: any) {
        if (err.message === "OFFLINE_MODE") {
          toast.success("SOS Queued Offline. SMS Fallback active.");
          setSelectedPhotos([]);
          const activeId = useSOSStore.getState().activeAlert?.id;
          if (activeId) runTriage(activeId, type, description);
        } else {
          console.warn("Online SOS failed, falling back to outbox queue.");
          await handleQueueSOS(type, description, location, photosToProcess);
          setSelectedPhotos([]);
        }
      }
    } catch (err: any) {
      toast.error("Emergency transmission system failure.");
    }
  };

  const runTriage = (id: string | null, type: EmergencyType, description: string) => {
    if (id && isWebLLMReady()) {
      triageEmergency({ type, description }, description)
        .then((result) => {
          if (result) {
            useSOSStore.getState().updateSOS(id, { aiAnalysis: result });
            toast.success("Guardian AI triage completed.", { icon: "🛡️" });
          }
        })
        .catch((e) => console.warn("[Triage] Background error:", e));
    }
  };

  const handleShout = useCallback(
    (reason: string) => {
      toast.error(`GUARDIAN AI: ${reason.toUpperCase()}`, {
        duration: 5000,
        icon: "🛡️",
      });
      handleSOS("OTHER", `Auto-SOS triggered by Guardian AI: ${reason}`);
    },
    [handleSOS]
  );

  const { startListening, stopListening } = useShoutDetection(handleShout);

  const handleVideoChunk = useCallback(
    async (chunk: Blob) => {
      if (!activeAlert?.id) return;
      const service = await import("../services/StorageService");
      await service.uploadVideoChunk(activeAlert.id, chunk, Date.now());
    },
    [activeAlert]
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

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 text-zinc-400">
        <div className="text-center">
          <div className="animate-pulse w-12 h-12 border-2 border-zinc-800 rounded-full mx-auto mb-4" />
          <p className="text-xs font-mono uppercase tracking-widest">
            Loading Tactical Profile...
          </p>
        </div>
      </div>
    );
  }

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

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* LEFT COLUMN - SOS & INCIDENT STATUS */}
        <div className="w-full lg:w-[450px] space-y-8 flex-shrink-0">
          <AnimatePresence mode="wait">
            {queuedCount > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="glass-panel border-info/30 bg-info/5 rounded-[32px] p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-info rounded-xl flex items-center justify-center animate-pulse">
                      <Zap className="text-white w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-info font-mono">
                        Outbox Active
                      </h5>
                      <p className="text-[9px] text-white/40 font-bold uppercase font-mono">
                        {queuedCount} SOS REPORTS QUEUED
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={forceSync}
                    disabled={isSyncing || !isOnline}
                    className="px-4 py-2 bg-info/20 border border-info/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-info"
                  >
                    {isSyncing ? "SYNC..." : "SYNC NOW"}
                  </button>
                </div>
              </motion.div>
            )}

            {activeAlert && (
              <motion.div
                initial={{ opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-panel border-emergency/50 rounded-[40px] p-6 shadow-glow-red relative overflow-hidden"
              >
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emergency rounded-2xl flex items-center justify-center sos-glow">
                      <Zap className="text-white w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black italic tracking-tighter text-white uppercase font-mono">
                        Incident Live
                      </h4>
                      <p className="text-[9px] text-white/40 font-bold uppercase tracking-[0.2em] font-mono">
                        {activeAlert.status.toUpperCase()} • {activeAlert.type}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-1.5 bg-brand-bg rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emergency shadow-glow-red"
                        animate={{
                          width:
                            activeAlert.status === "pending"
                              ? "33%"
                              : activeAlert.status === "responding"
                              ? "66%"
                              : "100%",
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[7px] font-mono text-white/20 uppercase tracking-widest">
                      <span>Dispatch</span>
                      <span>En Route</span>
                      <span>On Scene</span>
                    </div>
                  </div>

                  {activeAlert.status === "resolved" ||
                  activeAlert.status === "cancelled" ? (
                    <button
                      onClick={() => useSOSStore.getState().clearActiveAlert()}
                      className="w-full py-4 bg-info/20 border border-info/30 rounded-2xl text-[10px] font-black uppercase tracking-widest text-info"
                    >
                      ACKNOWLEDGE
                    </button>
                  ) : (
                    <LongPressButton
                      onComplete={async () => {
                        const { cancelSOS } = useSOSStore.getState();
                        await cancelSOS(activeAlert.id);
                      }}
                      text="HOLD TO ABORT SOS"
                      subtext="3 SECOND LOCKOUT"
                      className="w-full"
                    />
                  )}
                </div>
              </motion.div>
            )}

            {!activeAlert && (
              <SOSButtonPanel
                isSending={isSending}
                guardianMode={guardianMode}
                setGuardianMode={setGuardianMode}
                onInitiateSOS={handleSOS}
              />
            )}
          </AnimatePresence>

          {/* Tactical Photo Evidence */}
          <div className="p-6 glass-panel border-white/5 rounded-[32px] space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 font-mono">
                Incident Evidence
              </label>
              <button
                onClick={() => photoInputRef.current?.click()}
                className="p-2 bg-white/5 rounded-xl text-white/60 hover:bg-white/10"
              >
                <Camera className="w-4 h-4" />
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
              <div className="flex gap-2 overflow-x-auto pb-2">
                {selectedPhotos.map((file, idx) => (
                  <div
                    key={idx}
                    className="relative min-w-[80px] h-20 rounded-xl overflow-hidden border border-white/10"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() =>
                        setSelectedPhotos((p) => p.filter((_, i) => i !== idx))
                      }
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER/RIGHT COLUMN - INTEL MAP & TRACKER */}
        <div className="flex-1 w-full space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-tactical-cyan font-mono italic">
                Live Intel Grid
              </h3>
              <div className="h-[400px] rounded-[32px] overflow-hidden glass-panel border border-white/5 relative">
                <ActiveMap alerts={[]} patrols={visiblePatrols} />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 font-mono italic">
                Incident Telemetry
              </h3>
              <CitizenReportTracker userId={profile?.id || ""} />
            </div>
          </div>

          {/* Resident Console Links */}
          {onTabChange && (
            <div className="tactical-panel border-white/5 p-6 rounded-[32px] bg-black/20">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    id: "map",
                    label: "Livemap",
                    icon: MapIcon,
                    color: "text-tactical-cyan",
                  },
                  {
                    id: "tracker",
                    label: "Tracker",
                    icon: Activity,
                    color: "text-emerald-400",
                  },
                  {
                    id: "directory",
                    label: "Hotlines",
                    icon: PhoneCall,
                    color: "text-rose-400",
                  },
                  {
                    id: "guardian",
                    label: "Guardian",
                    icon: Cpu,
                    color: "text-fuchsia-400",
                  },
                  {
                    id: "notes",
                    label: "Notes",
                    icon: BookOpen,
                    color: "text-emerald-300",
                  },
                ].map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => onTabChange(mod.id)}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 group transition-all"
                  >
                    <mod.icon className={`w-4 h-4 ${mod.color}`} />
                    <span className="text-[10px] font-black uppercase font-mono text-white/60 group-hover:text-white">
                      {mod.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 font-mono italic">
              Voice Operations
            </h3>
            <OfflineVoiceManager />
          </div>

          {activeAlert && (
            <div className="mt-8">
              <SOSChat alertId={activeAlert.id} currentUser={profile} />
            </div>
          )}
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
