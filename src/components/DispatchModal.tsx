import { useState, useEffect } from "react";
import * as api from "../lib/api";
import socket from "../lib/socket";
import { User, Alert, PatrolLocation } from "../types";
import { X, Shield, Send, Bot } from "lucide-react";
import { cn } from "../lib/utils";
import toast from "react-hot-toast";
import { GuardianDispatcher } from "./Admin/GuardianDispatcher";

interface DispatchModalProps {
  alert: Alert;
  onClose: () => void;
  patrols: PatrolLocation[];
}

export default function DispatchModal({
  alert,
  onClose,
  patrols,
}: DispatchModalProps) {
  const [tanods, setTanods] = useState<User[]>([]);
  const [selectedTanod, setSelectedTanod] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTanods = async () => {
      try {
        const data = await api.generic.list("users?role=tanod");
        // Filter for those who are approved and NOT currently responding/offline
        const available = data.filter(
          (t: User) =>
            t.status === "approved" ||
            t.status === "Available" ||
            t.status === "On Patrol"
        );
        setTanods(available);
      } catch (err) {
        console.error("Failed to fetch tanods for dispatch", err);
      }
    };

    fetchTanods();
    socket.on("tanod_update", () => fetchTanods());

    return () => {
      socket.off("tanod_update");
    };
  }, []);

  const handleDispatch = async (tanodIdOverride?: string) => {
    const id = tanodIdOverride || selectedTanod;
    if (!id) return;
    setSubmitting(true);
    try {
      const tanod = tanods.find((t) => t.id === id);
      const updateData = {
        status: "responding" as const,
        assignedTo: id,
        assignedToName: tanod?.name || "Assigned Tanod",
        respondedBy: id,
        respondedByName: tanod?.name || "Assigned Tanod",
        respondedAt: new Date().toISOString(),
      };

      await api.alerts.updateAlert(alert.id, updateData);

      // Update Tanod status in roster
      try {
        await api.generic.update(`users/${selectedTanod}`, {
          status: "Responding",
          activeAlertId: alert.id,
        });
      } catch (e) {
        console.warn("Failed to update Tanod status in roster:", e);
      }

      toast.success(`Unit ${tanod?.name || "Assigned Tanod"} dispatched`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to dispatch tanod");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-start justify-center p-4 pt-10 overflow-y-auto pb-10">
      <div className="bg-[#16191F] border border-[#2D3139] w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl">
        <div className="p-6 md:p-8 border-b border-[#2D3139] flex justify-between items-center bg-[#1A1D23]">
          <div>
            <h3 className="font-black italic text-xl md:text-2xl tracking-tighter uppercase text-white">
              Tactical Dispatch Center
            </h3>
            <p className="text-[#8E9299] text-[9px] font-black uppercase tracking-[0.2em]">
              Unit Management & AI Guidance
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#252932] rounded-full transition-colors text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-0 divide-y md:divide-y-0 md:divide-x divide-[#2D3139]">
          {/* AI Guidance Side */}
          <div className="md:col-span-2 p-6 bg-black/20 h-full overflow-y-auto">
            <GuardianDispatcher 
              activeAlert={alert} 
              onDispatchToUnit={async (alert, unitId) => {
                await handleDispatch(unitId);
              }}
            />
          </div>

          {/* Unit Selection Side */}
          <div className="md:col-span-3 p-6 md:p-8 space-y-4 max-h-[60vh] overflow-y-auto">
            <h4 className="text-[10px] font-black text-[#8E9299] uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Shield className="w-3 h-3" /> Available Patrol Units
            </h4>
            {tanods.length === 0 ? (
              <div className="text-center py-12 text-[#8E9299]">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="font-bold text-xs uppercase">No active units online</p>
              </div>
            ) : (
              tanods.map((tanod) => (
                <button
                  key={tanod.id}
                  onClick={() => setSelectedTanod(tanod.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                    selectedTanod === tanod.id
                      ? "bg-[#FF4B4B]/10 border-[#FF4B4B] shadow-[0_0_20px_rgba(255,75,75,0.1)]"
                      : "bg-[#0F1115] border-[#2D3139] hover:border-[#8E9299]/30"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      selectedTanod === tanod.id
                        ? "bg-[#FF4B4B] text-white"
                        : "bg-[#252932] text-[#8E9299]"
                    )}
                  >
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-white uppercase italic tracking-tighter truncate">
                      {tanod.name}
                    </p>
                    <p className="text-[8px] text-[#8E9299] font-bold uppercase tracking-widest">
                      {patrols.find((p) => p.tanodId === tanod.id)?.isActive
                        ? "Tactical Signal Active"
                        : "Signal Lost"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="p-6 md:p-8 bg-[#1A1D23] border-t border-[#2D3139] flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 font-black italic text-[10px] text-[#8E9299] hover:text-white transition-colors uppercase tracking-widest"
          >
            HOLD_DISPATCH
          </button>
          <button
            disabled={!selectedTanod || submitting}
            onClick={() => handleDispatch()}
            className={cn(
              "flex-[2] py-4 rounded-2xl font-black italic text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 uppercase font-display",
              selectedTanod
                ? "bg-[#FF4B4B] text-white hover:scale-105 active:scale-95"
                : "bg-[#252932] text-[#8E9299] cursor-not-allowed"
            )}
          >
            {submitting ? (
              "SYNCING_UNITS..."
            ) : (
              <>
                <Send className="w-4 h-4" /> AUTHORIZE_DEPLOYMENT
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
