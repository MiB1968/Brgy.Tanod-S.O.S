// src/components/layout/AppHeader.tsx
import React from "react";
import { Plus, Siren, Bell, Menu } from "lucide-react";
import { TanodLogo } from "../Branding";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
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
  isMobileMenuOpen,
  setIsMobileMenuOpen,
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
        {/* Logo and Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 ml-0 rounded-xl bg-gray-900 border border-[#00f0ff]/20 text-tactical-cyan hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-tactical/5 cursor-pointer hover:border-tactical-cyan/40"
            aria-label="Open central console drawer"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <TanodLogo size={42} className="hidden sm:block" />
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tighter text-white leading-none">Brgy. Tanod</h1>
            <p className="text-[8px] sm:text-[10px] text-red-500 font-mono mt-0.5 sm:mt-0 uppercase tracking-wider">S.O.S. SYSTEM</p>
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
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onNewIncident}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 p-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-lg shadow-red-600/30 shrink-0"
            title="Declare emergency SOS incident"
          >
            <Plus className="w-5 h-5 text-white" />
            <span className="hidden sm:inline">New Incident</span>
          </button>

          {(effectiveRole === "admin" || effectiveRole === "superadmin") && (
            <button
              onClick={toggleGlobalSiren}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all shrink-0 ${globalSirenActive ? "bg-red-600 animate-pulse shadow-red-600/50" : "bg-gray-800 hover:bg-gray-700"}`}
              title="Toggle global alarm alarm"
            >
              <Siren className="w-5 h-5 text-white" />
            </button>
          )}

          <button className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gray-800 hover:bg-gray-700 transition-all relative shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </button>

          {isMasterAdmin && (
            <select
              value={viewOverride || ""}
              onChange={(e) => setViewOverride(e.target.value || null)}
              className="bg-gray-900 border border-gray-700 rounded-xl sm:rounded-2xl px-2.5 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-sm font-mono font-bold uppercase tracking-wider text-white focus:outline-none focus:border-tactical-cyan/40 hover:border-gray-500 transition-colors cursor-pointer shrink-0 max-w-[85px] xs:max-w-[120px] sm:max-w-none"
            >
              <option value="">Normal</option>
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
