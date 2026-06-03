import React from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { TanodWordmark } from "./Branding";
import { navItems, isRuben } from "../constants";
import { LogOut, X } from "lucide-react";

interface NavigationSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  effectiveRole: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  user: any;
  profile: any;
  handleLogout: () => void;
  deferredPrompt?: any;
  handleInstallApp: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  activeTab,
  setActiveTab,
  effectiveRole,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  user,
  profile,
  handleLogout,
  deferredPrompt,
  handleInstallApp,
}) => {
  const items = navItems.filter((item) => {
    if (effectiveRole === "admin" || effectiveRole === "superadmin") {
      return true;
    }
    if (effectiveRole === "tanod") {
      return !["residents", "settings", "logs"].includes(item.id);
    }
    return [
      "home",
      "map",
      "tracker",
      "resident-map",
      "schedule",
      "directory",
      "settings",
      "guardian",
    ].includes(item.id);
  });

  return (
    <nav
      className={cn(
        "fixed inset-y-0 left-0 w-72 glass-panel border-r border-white/5 flex flex-col shrink-0 z-[100] transition-transform duration-500 ease-out md:relative md:translate-x-0 md:w-64 lg:w-72 shadow-command",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="absolute top-0 left-0 w-full h-full bg-brand-bg/40 backdrop-blur-2xl -z-10" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emergency/5 blur-[100px] rounded-full" />

      <div className="p-6 pt-10 sm:pt-12 overflow-hidden flex flex-col items-center sm:items-start relative">
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-95 z-50"
          aria-label="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="scale-75 sm:scale-90 origin-center sm:origin-left mb-2">
          <TanodWordmark size="md" className="filter drop-shadow-xl" />
        </div>
        <div className="w-full flex flex-col items-center sm:items-start">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent sm:via-white/20" />
          <span className="text-[8px] sm:text-[9px] font-black tracking-[0.3em] sm:tracking-[0.4em] text-white/20 uppercase mt-4 font-mono italic">
            Central_Command
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 space-y-1.5 sm:space-y-2 overflow-y-auto custom-scrollbar pt-6">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl transition-all duration-300 relative group overflow-hidden",
                isActive
                  ? "bg-emergency text-white shadow-glow-red scale-[1.02] italic font-black"
                  : "text-white/40 hover:bg-white/5 hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 bg-emergency pointer-events-none -z-10"
                />
              )}
              <Icon
                className={cn(
                  "w-4 h-4 sm:w-5 sm:h-5",
                  isActive
                    ? "text-white"
                    : "text-white/20 group-hover:text-white"
                )}
              />
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-widest font-mono truncate">
                {item.label}
              </span>
            </button>
          );
        })}

        {deferredPrompt && (
          <button
            onClick={handleInstallApp}
            className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-info/10 text-info font-black border border-info/30 hover:bg-info/20 mt-6 sm:mt-8 transition-all hover:scale-[1.02] text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] font-mono shadow-[0_0_15px_rgba(59,130,246,0.2)]"
          >
            <span>INSTALL_APP</span>
          </button>
        )}
      </div>

      <div className="p-4 sm:p-6 mt-auto border-t border-white/5 bg-brand-bg/40 backdrop-blur-xl">
        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-brand-bg/50 mb-4 sm:mb-6 border border-white/5 shadow-inner">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand-card overflow-hidden flex items-center justify-center border border-white/5 shrink-0 shadow-lg relative">
            {isRuben(user?.id, user?.email) ? (
              <img
                src="/ruben_avatar.jpg"
                referrerPolicy="no-referrer"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : user?.photoURL ? (
              <img
                src={user.photoURL}
                referrerPolicy="no-referrer"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 bg-white/10 rounded-full" />
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-brand-card" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-black truncate uppercase font-mono italic text-white leading-tight mb-0.5 sm:mb-1">
              {isRuben(user?.id, user?.email)
                ? "System Admin"
                : profile?.name || "Unit_Unknown"}
            </p>
            <p className="text-[7px] sm:text-[8px] text-white/30 uppercase tracking-[0.2em] font-mono font-bold truncate">
              {effectiveRole}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-white/40 hover:text-emergency hover:bg-emergency/5 transition-all text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] font-mono border border-transparent hover:border-emergency/10"
        >
          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          SIGNOUT_LINK
        </button>
      </div>
    </nav>
  );
};
