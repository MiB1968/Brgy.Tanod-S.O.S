// src/components/layout/AppHeader.tsx
import React from "react";
import { Menu, X, Bell, Plus, Siren, LogOut, User } from "lucide-react";
import { TanodLogo } from "../Branding";

interface AppHeaderProps {
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
}: AppHeaderProps) {
  const navItems = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "map", label: "Map", icon: "🗺️" },
    { key: "tracker", label: "Tracker", icon: "🛡️" },
    { key: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur-lg border-b border-gray-800">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <TanodLogo size={36} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Brgy. Tanod</h1>
            <p className="text-[10px] text-red-500 -mt-1 font-mono">S.O.S. SYSTEM</p>
          </div>
        </div>

        {/* Role Indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <div
            className={`px-4 py-1.5 text-xs font-semibold rounded-full border capitalize transition-colors ${
              effectiveRole === "superadmin"
                ? "border-red-500 text-red-400 bg-red-500/10"
                : effectiveRole === "admin"
                ? "border-orange-500 text-orange-400 bg-orange-500/10"
                : effectiveRole === "tanod"
                ? "border-blue-500 text-blue-400 bg-blue-500/10"
                : "border-green-500 text-green-400 bg-green-500/10"
            }`}
          >
            {effectiveRole}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* New Incident Button */}
          <button
            onClick={onNewIncident}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Report</span>
          </button>

          {/* Global Siren (Admin Only) */}
          {(effectiveRole === "admin" || effectiveRole === "superadmin") && (
            <button
              onClick={toggleGlobalSiren}
              className={`p-3 rounded-2xl transition-all ${
                globalSirenActive
                  ? "bg-red-600 animate-pulse shadow-lg shadow-red-600/50"
                  : "bg-gray-800 hover:bg-gray-700"
              }`}
            >
              <Siren className="w-5 h-5" />
            </button>
          )}

          {/* Notifications */}
          <button className="p-3 rounded-2xl bg-gray-800 hover:bg-gray-700 transition-all relative">
            <Bell className="w-5 h-5" />
            {/* We will assume alerts are not passed as prop here based on the requested code, 
                let's remove alerts count logic since it's not in props */}
          </button>

          {/* Master Admin Role Switcher */}
          {isMasterAdmin && (
            <select
              value={viewOverride || ""}
              onChange={(e) => setViewOverride(e.target.value || null)}
              className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none"
            >
              <option value="">Normal View</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="tanod">Tanod</option>
              <option value="resident">Resident</option>
            </select>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-3 rounded-2xl bg-gray-800 hover:bg-gray-700"
            onClick={() => {/* Mobile menu logic can be added in AppLayout */}}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <div className="md:hidden border-t border-gray-800 bg-gray-950">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex flex-col items-center py-1 px-3 text-xs transition-all ${
                activeTab === item.key ? "text-red-500" : "text-gray-400"
              }`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
