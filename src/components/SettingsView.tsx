import { useState } from "react";
import {
  Shield,
  MapPin,
  Phone,
  Bell,
  Monitor,
  Trash2,
  Download,
  AlertTriangle,
} from "lucide-react";
import { User, UserRole, TanodProfile, ResidentProfile } from "../types";
import { cn } from "../lib/utils";
import { toast } from "react-hot-toast";
import * as api from "../lib/api";
import socket from "../lib/socket";
import * as safeStorage from "../lib/safeStorage";
import AudioSettings from "./AudioSettings";
import MigrationUtility from "./Admin/MigrationUtility";

export default function SettingsView({
  profile,
  role,
}: {
  profile: User | null;
  role: UserRole;
}) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [tacticalMode, setTacticalMode] = useState(true);

  if (!profile) return null;

  const isLocationSharingEnabled =
    (profile as TanodProfile).isLocationSharingEnabled !== false;

  const handleLocationToggle = async (active: boolean) => {
    if (!profile.id) return;
    try {
      await api.generic.update(`users/${profile.id}`, {
        isLocationSharingEnabled: active,
        updatedAt: new Date().toISOString(),
      });
      socket.emit("tanod_update", { id: profile.id });

      toast.success(
        active
          ? "GPS Intel Link: RE-ESTABLISHED"
          : "GPS Intel Link: ENCRYPTED_OFFLINE",
        {
          icon: active ? "📡" : "🔏",
          style: {
            borderRadius: "10px",
            background: "#14171d",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: "12px",
            fontWeight: "bold",
            fontFamily: "monospace",
          },
        },
      );
    } catch (e) {
      console.error("Failed to update location preferences", e);
      toast.error("Command Error: Settings Sync Failed");
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="glass-panel p-8 md:p-12 rounded-[48px] border-white/5 shadow-command relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-emergency/30" />
        <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-white font-mono leading-none">
          Command Config
        </h2>
        <p className="text-white/30 font-bold text-xs md:text-sm uppercase tracking-[0.3em] font-mono mt-3">
          Personal Link Preferences & Privacy Controls
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Card */}
        <div className="glass-panel border-white/5 rounded-[40px] p-8 md:p-10 space-y-8 relative overflow-hidden group hover:border-white/10 transition-all shadow-command skew-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />

          <div>
            <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-4 font-mono">
              Authentication Profile
            </h4>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-emergency/20 border border-emergency/30 flex items-center justify-center p-0.5">
                <div className="w-full h-full bg-emergency rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl font-black text-white italic">
                    {profile.name.charAt(0)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-white italic tracking-tighter uppercase font-mono leading-tight">
                  {profile.name}
                </p>
                <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest font-mono mt-1">
                  {profile.email}
                </p>
                <span className="inline-block mt-3 px-3 py-1 bg-white/5 border border-white/10 text-white/60 text-[8px] font-black rounded-full uppercase tracking-widest font-mono">
                  Clearance: {role.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-white/5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-white/30 font-black uppercase tracking-widest">
                Active Phone Link
              </span>
              <span className="text-white font-bold italic">
                {profile.phone || "NONE_CONNECTED"}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-white/30 font-black uppercase tracking-widest">
                Global Status
              </span>
              <span className="text-success font-black italic uppercase">
                Verified_Link
              </span>
            </div>
          </div>
        </div>

        {/* Global System Settings */}
        <div className="glass-panel border-white/5 rounded-[40px] p-8 md:p-10 space-y-8 shadow-command">
          <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] font-mono">
            System Parameters
          </h4>

          <div className="space-y-6">
            <ToggleRow
              icon={Bell}
              label="Tactical PUSH Signals"
              desc="Receive global alerts & dispatches"
              active={notificationsEnabled}
              onChange={setNotificationsEnabled}
            />
            <ToggleRow
              icon={MapPin}
              label="Network GPS Sync"
              desc="Update unit position in real-time"
              active={isLocationSharingEnabled}
              onChange={handleLocationToggle}
            />
            <ToggleRow
              icon={Monitor}
              label="High-Vis Terminal"
              desc="Enhanced contrast for field ops"
              active={highContrast}
              onChange={setHighContrast}
            />
            <ToggleRow
              icon={Shield}
              label="Command Mode UI"
              desc="Full tactical bento aesthetics"
              active={tacticalMode}
              onChange={setTacticalMode}
            />
          </div>
        </div>

        {/* Audio Manager Settings */}
        <div className="md:col-span-2">
          <AudioSettings />
        </div>

        {/* Storage Management */}
        <div className="md:col-span-2 glass-panel border-white/5 rounded-[40px] p-8 md:p-12 shadow-command">
          <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-8 font-mono">
            Cache & Storage Engine
          </h4>

          <div className="flex flex-col md:flex-row gap-6">
            <button
              onClick={() => toast.success("Syncing tactical archives...")}
              className="flex-1 p-8 rounded-3xl bg-brand-bg/50 border border-white/5 hover:border-info/30 transition-all text-left group"
            >
              <Download className="w-8 h-8 text-info mb-4 opacity-40 group-hover:opacity-100 transition-opacity" />
              <h5 className="text-white font-black italic font-mono uppercase text-lg tracking-tighter">
                Export Session Data
              </h5>
              <p className="text-white/20 text-[10px] font-black uppercase tracking-widest font-mono mt-1">
                Audit log download (.JSON)
              </p>
            </button>

            <button
              onClick={() => {
                if (
                  confirm("PURGE LOCAL TERMINAL DATA? THIS CANNOT BE UNDONE.")
                ) {
                  safeStorage.clear();
                  window.location.reload();
                }
              }}
              className="flex-1 p-8 rounded-3xl bg-emergency/5 border border-emergency/10 hover:border-emergency/40 transition-all text-left group"
            >
              <Trash2 className="w-8 h-8 text-emergency mb-4 opacity-40 group-hover:opacity-100 transition-opacity" />
              <h5 className="text-emergency font-black italic font-mono uppercase text-lg tracking-tighter">
                Terminal Purge
              </h5>
              <p className="text-emergency/30 text-[10px] font-black uppercase tracking-widest font-mono mt-1">
                Clear all local caches & syncs
              </p>
            </button>
          </div>
        </div>

        {/* Database Migration */}
        {role === 'superadmin' && (
          <div className="md:col-span-2">
            <MigrationUtility />
          </div>
        )}

        {/* Security Alert Header */}
        <div className="md:col-span-2 p-10 bg-emergency/10 border border-emergency/30 rounded-[40px] flex gap-8 items-center">
          <div className="w-20 h-20 rounded-full bg-emergency/10 border border-emergency/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-10 h-10 text-emergency" />
          </div>
          <div>
            <h5 className="text-xl font-black italic text-white font-mono uppercase tracking-tighter">
              Operational Security Warning
            </h5>
            <p className="text-white/40 text-xs md:text-sm font-bold mt-2 font-mono uppercase leading-relaxed max-w-2xl">
              Always ensure your communication link is encrypted. If you lose
              your primary authenticated device, initiate an immediate remote
              session kill via Brgy. Command Admin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, desc, active, onChange }: any) {
  return (
    <div className="flex items-center justify-between gap-6 group">
      <div className="flex items-center gap-5">
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border",
            active
              ? "bg-info/20 text-info border-info/30"
              : "bg-white/5 text-white/20 border-white/5",
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-white font-black text-xs uppercase italic tracking-tighter mb-1 font-mono">
            {label}
          </p>
          <p className="text-white/20 text-[9px] font-black uppercase tracking-widest font-mono">
            {desc}
          </p>
        </div>
      </div>

      <button
        onClick={() => onChange(!active)}
        className={cn(
          "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
          active
            ? "bg-info shadow-[0_0_15px_rgba(14,165,233,0.3)]"
            : "bg-white/10",
        )}
      >
        <div
          className={cn(
            "w-4 h-4 rounded-full bg-white transition-all shadow-md",
            active ? "translate-x-6" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
