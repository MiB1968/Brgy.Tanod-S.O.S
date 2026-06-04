// src/components/layout/AppLayout.tsx
import React from "react";
import {
  Home,
  Map,
  Shield,
  Settings,
  Menu,
  ClipboardList,
  HardDrive,
  Navigation,
  Bot,
  Phone,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { NavigationSidebar } from "../NavigationSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  effectiveRole: string;
  user?: any;
  profile?: any;
  handleLogout?: () => void;
  deferredPrompt?: any;
  handleInstallApp?: () => void;
  viewOverride?: string | null;
  setViewOverride?: (role: string | null) => void;
}

export default function AppLayout({
  children,
  activeTab,
  setActiveTab,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  effectiveRole,
  user,
  profile,
  handleLogout = () => {},
  deferredPrompt,
  handleInstallApp = () => {},
  viewOverride,
  setViewOverride,
}: AppLayoutProps) {
  // Custom smart bottom tabs designed for different roles
  const getTabsByRole = (role: string) => {
    switch (role) {
      case "admin":
      case "super_admin":
        return [
          { id: "home", label: "Command", icon: Home },
          { id: "map", label: "Live Intel", icon: Map },
          { id: "logs", label: "Logs", icon: ClipboardList },
          { id: "users", label: "Users", icon: UserCheck },
          { id: "settings", label: "Config", icon: Settings },
        ];
      case "tanod":
        return [
          { id: "home", label: "Command", icon: Home },
          { id: "map", label: "Live Map", icon: Map },
          { id: "areas", label: "Areas", icon: HardDrive },
          { id: "tracker", label: "My GPS", icon: Navigation },
          { id: "guardian", label: "Guardian", icon: Bot },
        ];
      case "resident":
      default:
        return [
          { id: "home", label: "Command", icon: Home },
          { id: "map", label: "Tanod Map", icon: Map },
          { id: "directory", label: "Hotlines", icon: Phone },
          { id: "guardian", label: "Guardian", icon: Bot },
          { id: "settings", label: "Config", icon: Settings },
        ];
    }
  };

  const tabs = getTabsByRole(effectiveRole);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar Navigation */}
      <NavigationSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        effectiveRole={effectiveRole}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        user={user}
        profile={profile}
        handleLogout={handleLogout}
        deferredPrompt={deferredPrompt}
        handleInstallApp={handleInstallApp}
      />

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden cursor-pointer"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative z-0">
        {/* Top Bar / Status */}
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 shrink-0" />

        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-950/70 border-b border-white/5 backdrop-blur-xl shrink-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-slate-900/80 border border-white/10 text-white hover:bg-slate-800 transition-all hover:border-emergency/35 active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.05)]"
              aria-label="Open side drawer"
              id="mobile-drawer-trigger"
            >
              <Menu className="w-5 h-5 text-emergency animate-pulse" />
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-black font-mono tracking-widest text-white leading-none uppercase italic">
                BRGY.<span className="text-emergency">S.O.S.</span>
              </span>
              <span className="text-[7.5px] font-black text-white/30 uppercase tracking-[0.25em] font-mono leading-none mt-1">
                Central_Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#0F172A]/70 px-4 py-1.5 rounded-full border border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emergency animate-ping" />
            <span className="text-[9px] font-mono font-black text-white/50 tracking-widest uppercase">
              {effectiveRole}
            </span>
          </div>
        </div>

        {/* Sandbox Override View Controller Banner */}
        {viewOverride && (
          <div className="bg-amber-500 border-b border-amber-600 px-4 py-2.5 md:py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-zinc-950 font-sans z-[9999] relative shadow-lg">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-zinc-900 shrink-0 animate-pulse" />
              <div className="text-[11px] leading-tight font-medium">
                <span className="font-extrabold pb-0.5 tracking-wide uppercase text-zinc-950 block sm:inline mr-1">
                  Sandbox Preview Active:
                </span>{" "}
                Mimicking{" "}
                <strong className="underline uppercase font-bold text-zinc-900">
                  {viewOverride === "admin"
                    ? "Barangay Admin"
                    : viewOverride === "tanod"
                    ? "Tanod Responder"
                    : "Citizen Resident"}
                </strong>{" "}
                interface. Other modules are responding live.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 justify-center">
              <span className="text-[9px] font-bold text-zinc-900/60 mr-1 uppercase font-mono hidden md:inline">
                Quick Swap:
              </span>
              <button
                onClick={() => setViewOverride?.("admin")}
                className={`px-2.5 py-1 rounded-[4px] text-[10px] font-mono font-bold uppercase transition-all tracking-tighter cursor-pointer ${
                  viewOverride === "admin"
                    ? "bg-zinc-950 text-amber-400 font-extrabold shadow-md"
                    : "bg-zinc-950/10 hover:bg-zinc-950/20 text-zinc-900 hover:text-zinc-950 border border-zinc-950/10"
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => setViewOverride?.("tanod")}
                className={`px-2.5 py-1 rounded-[4px] text-[10px] font-mono font-bold uppercase transition-all tracking-tighter cursor-pointer ${
                  viewOverride === "tanod"
                    ? "bg-zinc-950 text-amber-400 font-extrabold shadow-md"
                    : "bg-zinc-950/10 hover:bg-zinc-950/20 text-zinc-900 hover:text-zinc-950 border border-zinc-950/10"
                }`}
              >
                Tanod
              </button>
              <button
                onClick={() => setViewOverride?.("resident")}
                className={`px-2.5 py-1 rounded-[4px] text-[10px] font-mono font-bold uppercase transition-all tracking-tighter cursor-pointer ${
                  viewOverride === "resident"
                    ? "bg-zinc-950 text-amber-400 font-extrabold shadow-md"
                    : "bg-zinc-950/10 hover:bg-zinc-950/20 text-zinc-900 hover:text-zinc-950 border border-zinc-950/10"
                }`}
              >
                Resident
              </button>
              <button
                onClick={() => setViewOverride?.(null)}
                className="px-2.5 py-1 rounded-[4px] text-[10px] font-extrabold uppercase tracking-tighter bg-red-650 hover:bg-red-700 text-white transition-all shadow shadow-red-900/30 ml-2 hover:scale-[1.02] active:scale-95 cursor-pointer border border-red-700"
              >
                Reset to Super Panel 🛡️
              </button>
            </div>
          </div>
        )}

        {children}

        {/* Mobile Bottom Navigation - Cyberpunk Tactical Style */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-tactical-dark/95 backdrop-blur-2xl md:hidden safe-area-bottom">
          <div className="flex items-center justify-around py-3 max-w-md mx-auto px-4">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  className={`flex flex-col items-center py-1.5 px-3 transition-transform duration-200 active:scale-95 ${
                    isActive
                      ? "text-tactical-red scale-110"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mb-1 transition-colors ${
                      isActive ? "text-tactical-red" : ""
                    }`}
                  />
                  <span className="text-[9px] font-mono font-bold tracking-tight uppercase">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
