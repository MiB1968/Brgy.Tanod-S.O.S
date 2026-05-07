
import React from 'react';
import { cn } from '../lib/utils';
import { TanodWordmark } from './Branding';
import { navItems } from '../constants';
import { LogOut } from 'lucide-react';

interface NavigationSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  effectiveRole: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  user: any;
  profile: any;
  handleSignOut: () => void;
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
  handleSignOut,
  deferredPrompt,
  handleInstallApp,
}) => {
  const items = navItems.filter(item => {
    if (effectiveRole === 'admin' || effectiveRole === 'superadmin') {
      return item.id !== 'map'; 
    }
    if (effectiveRole === 'tanod') {
      return !['residents', 'settings', 'map', 'logs'].includes(item.id);
    }
    return ['home', 'map', 'tracker', 'directory', 'settings'].includes(item.id);
  });

  return (
    <nav className={cn(
      "fixed inset-y-0 left-0 w-80 glass-panel border-r border-white/5 flex flex-col shrink-0 z-[100] transition-transform duration-500 ease-out md:relative md:translate-x-0 md:w-72 shadow-command",
      isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="absolute top-0 left-0 w-full h-full bg-brand-bg/20 -z-10" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emergency/5 blur-[100px] rounded-full" />
      
      <div className="p-6 pt-10 overflow-hidden">
        <div className="scale-75 origin-left">
          <TanodWordmark size="md" className="filter drop-shadow-lg" />
        </div>
        <div className="mt-2 flex flex-col items-center">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[9px] font-black tracking-[0.4em] text-white/20 uppercase mt-4 font-mono italic">Central Command</span>
        </div>
      </div>

      <div className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar pt-4">
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
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 relative group",
                isActive 
                  ? "bg-emergency text-white shadow-glow-red scale-[1.02] italic font-black" 
                  : "text-white/40 hover:bg-white/5 hover:text-white"
              )}
            >
              {!isActive && (
                  <div className="absolute inset-y-2 left-2 w-1 bg-emergency rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-white/20 group-hover:text-white")} />
              <span className="text-xs uppercase tracking-widest font-mono">{item.label}</span>
            </button>
          );
        })}
        
        {deferredPrompt && (
          <button
            onClick={handleInstallApp}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-info/10 text-info font-black border border-info/30 hover:bg-info/20 mt-8 transition-all hover:scale-[1.02] uppercase tracking-[0.2em] font-mono shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          >
            <span>INSTALL MOBILE APP</span>
          </button>
        )}
      </div>

      <div className="p-6 mt-auto border-t border-white/5 bg-brand-bg/30">
        <div className="flex items-center gap-4 p-4 rounded-3xl bg-brand-bg/50 mb-6 border border-white/5 shadow-inner">
          <div className="w-12 h-12 rounded-2xl bg-brand-card overflow-hidden flex items-center justify-center border border-white/5 shrink-0 shadow-lg">
            {user.email === 'rubenlleg12@gmail.com' ? (
              <img src="/ruben_avatar.jpg" referrerPolicy="no-referrer" alt="Profile" className="w-full h-full object-cover" />
            ) : user.photoURL ? (
              <img src={user.photoURL} referrerPolicy="no-referrer" alt="Profile" className="w-full h-full object-cover" />
            ) : (
                <div className="w-6 h-6 bg-white/10 rounded-full" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black truncate uppercase font-mono italic text-white leading-none mb-1">
              {user.email === 'rubenlleg12@gmail.com' ? 'RubenLlego' : profile?.name || 'Unknown Unit'}
            </p>
            <p className="text-[8px] text-white/30 uppercase tracking-widest font-mono font-bold">
              {user.email === 'rubenlleg12@gmail.com' ? 'SYSTEM_PRIME' : profile?.role || 'INITIATING'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleSignOut} 
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-white/40 hover:text-emergency hover:bg-emergency/5 transition-all text-[10px] font-black uppercase tracking-[0.2em] font-mono border border-transparent hover:border-emergency/10"
        >
          <LogOut className="w-4 h-4" />
          SIGNOUT_SESSION
        </button>
      </div>
    </nav>
  );
};
