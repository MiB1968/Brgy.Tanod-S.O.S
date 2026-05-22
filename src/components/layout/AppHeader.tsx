// src/components/layout/AppHeader.tsx
import React from "react";
import { Plus, Siren, Bell, Menu } from "lucide-react";
import { TanodLogo } from "../Branding";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  effectiveRole: string;
  isMasterAdmin: boolean;
  viewOverride: string | null;
  setViewOverride: (role: string | null) => void;
  globalSirenActive: boolean;
  toggleGlobalSiren: () => void;
  onNewIncident: () => void;
}

export default function AppHeader({
  activeTab,
  setActiveTab,
  effectiveRole,
  isMasterAdmin,
  viewOverride,
  setViewOverride,
  globalSirenActive,
  toggleGlobalSiren,
  onNewIncident,
}: Props) {
  return (
    <header className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur-2xl border-b border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <TanodLogo size={42} />
          <div>
            <h1 className="text-2xl font-bold tracking-tighter text-white">Brgy. Tanod</h1>
            <p className="text-[10px] text-red-500 font-mono -mt-1">S.O.S. SYSTEM</p>
          </div>
        </div>

        {/* Role Badge */}
        <div className="hidden md:flex items-center gap-2">
          <div className={`px-5 py-1.5 text-xs font-semibold rounded-full border capitalize transition-colors ${
            effectiveRole === "superadmin" ? "border-red-500 bg-red-500/10 text-red-400" :
            effectiveRole === "admin" ? "border-orange-500 bg-orange-500/10 text-orange-400" :
            effectiveRole === "tanod" ? "border-blue-500 bg-blue-500/10 text-blue-400" :
            "border-emerald-500 bg-emerald-500/10 text-emerald-400"
          }`}>
            {effectiveRole}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNewIncident}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 px-6 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 shadow-lg shadow-red-600/30"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Incident</span>
          </button>

          {(effectiveRole === "admin" || effectiveRole === "superadmin") && (
            <button
              onClick={toggleGlobalSiren}
              className={`p-3 rounded-2xl transition-all ${globalSirenActive ? "bg-red-600 animate-pulse shadow-red-600/50" : "bg-gray-800 hover:bg-gray-700"}`}
            >
              <Siren className="w-5 h-5" />
            </button>
          )}

          <button className="p-3 rounded-2xl bg-gray-800 hover:bg-gray-700 transition-all relative">
            <Bell className="w-5 h-5" />
          </button>

          {isMasterAdmin && (
            <select
              value={viewOverride || ""}
              onChange={(e) => setViewOverride(e.target.value || null)}
              className="bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none"
            >
              <option value="">Normal View</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="tanod">Tanod</option>
              <option value="resident">Resident</option>
            </select>
          )}
        </div>
      </div>
    </header>
  );
}
