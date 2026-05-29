import { motion } from 'motion/react';
import { Info, Map as MapIcon, LayoutGrid, Monitor, Columns, Shield, Terminal, Radio, Users } from 'lucide-react';
import { TanodLogo } from '../Branding';
import { ReviewArchivedLogsDrawer } from '../Admin/ReviewArchivedLogsDrawer';
import { User } from '../../types';
import { GuardianAILoader } from '../GuardianAILoader';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

interface DashboardHeaderProps {
  profile: User | null;
  setIsAboutOpen: (open: boolean) => void;
  setIsFeatureMapOpen: (open: boolean) => void;
  layout: 'standard' | 'panoramic' | 'monitor';
  setLayout: (layout: 'standard' | 'panoramic' | 'monitor') => void;
  viewOverride?: string | null;
  setViewOverride?: (role: string | null) => void;
}

export function DashboardHeader({ 
  profile, 
  setIsAboutOpen, 
  setIsFeatureMapOpen,
  layout,
  setLayout,
  viewOverride,
  setViewOverride
}: DashboardHeaderProps) {
  const isSuperAdmin = profile?.role === 'superadmin' || 
                       profile?.email === 'rubenlleg12@gmail.com' || 
                       profile?.email === 'ben@brgytanod.com';

  return (
    <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-6 mb-10 relative glass-panel p-6 sm:p-8 rounded-[32px] sm:rounded-[48px] border-white/10 skew-card shadow-2xl">
      <div className="scanline opacity-20 pointer-events-none" />
      <div className="tactical-bg-glow absolute inset-0 rounded-[32px] sm:rounded-[48px] pointer-events-none" />
      
      <div className="relative z-10 w-full flex flex-col items-start gap-4">
        <div className="flex items-center justify-between w-full gap-2 min-h-8">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emergency animate-pulse shrink-0" />
            <span className="text-[8px] sm:text-[10px] font-mono text-emergency font-black uppercase tracking-[0.1rem] sm:tracking-[0.4em] whitespace-nowrap">Signal: Secure Encryption Active</span>
          </div>
          <GuardianAILoader />
        </div>
        <h2 className="text-2xl sm:text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-white font-mono leading-none flex items-center flex-wrap gap-2 sm:gap-4 outline-text">
          <TanodLogo size={40} animated={true} className="sm:w-16 sm:h-16 text-emergency shadow-glow-red shrink-0" />
          <div className="flex flex-col">
            <span className="flex items-center">COMMAND<span className="text-emergency">CENTER</span></span>
            <span className="text-[8px] sm:text-[10px] font-black tracking-[0.3em] sm:tracking-[0.5em] text-white/20 -mt-0.5 sm:-mt-1 ml-0.5 sm:ml-1">ADMIN_PANEL_v2</span>
          </div>
        </h2>
        
        {/* Superior Admin Controls */}
        {isSuperAdmin && (
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {/* View Override Selector - Polished Interactive Toggle */}
            <div className="flex items-center gap-1 bg-gray-950/65 p-1 rounded-2xl border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] relative">
              {[
                { key: null, label: "Super", icon: Shield, activeClass: "bg-red-500/15 text-red-400 border-red-500/35", glowColor: "shadow-red-500/20" },
                { key: "admin", label: "Admin", icon: Terminal, activeClass: "bg-orange-500/15 text-orange-400 border-orange-500/35", glowColor: "shadow-orange-500/20" },
                { key: "tanod", label: "Tanod", icon: Radio, activeClass: "bg-blue-500/15 text-blue-400 border-blue-500/35", glowColor: "shadow-blue-500/20" },
                { key: "resident", label: "Res", icon: Users, activeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/35", glowColor: "shadow-emerald-500/20" },
              ].map((item) => {
                const isSelected = viewOverride === item.key;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.key || "super"}
                    onClick={() => setViewOverride?.(item.key)}
                    className="relative px-3.5 py-2.5 rounded-xl text-[10px] sm:text-xs font-black transition-all duration-300 uppercase tracking-tight flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 group focus:outline-none"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    {/* Animated Sliding Highlight Pill */}
                    {isSelected && (
                      <motion.div
                        layoutId="activeOverridePill"
                        className={`absolute inset-0 rounded-xl bg-white/5 ${item.activeClass} border shadow-lg ${item.glowColor}`}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}
                    
                    {/* Content Layer */}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <IconComponent className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'text-current' : 'text-white/45 group-hover:text-white/80'}`} />
                      <span className={isSelected ? 'text-current font-black' : 'text-white/50 group-hover:text-white/85'}>
                        {item.label}
                      </span>
                    </span>
                  </button>
                );
              })}
              
              <div className="px-3.5 py-1 border-l border-white/15 relative z-10 hidden sm:flex items-center">
                <span className="text-[8px] font-black font-mono text-white/30 uppercase tracking-widest whitespace-nowrap">
                   PREVIEW_ROLE
                </span>
              </div>
            </div>

            {/* Layout Switcher - Polished Interactive Toggle */}
            <div className="flex items-center gap-1 bg-gray-950/65 p-1 rounded-2xl border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] relative">
              {([
                { key: "monitor", icon: Monitor, label: "SOLO", title: "Focus Monitor (1 Panel)" },
                { key: "standard", icon: Columns, label: "DUAL", title: "Strategic Split (2 Panels)" },
                { key: "panoramic", icon: LayoutGrid, label: "PANORAMIC", title: "Panoramic Command (3 Panels)" },
              ] as const).map((item) => {
                const isSelected = layout === item.key;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setLayout(item.key)}
                    className="relative p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 group focus:outline-none"
                    title={item.title}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    {/* Animated Sliding Highlight Pill */}
                    {isSelected && (
                      <motion.div
                        layoutId="activeLayoutPill"
                        className="absolute inset-0 rounded-xl bg-cyan-950/30 border border-cyan-500/35 shadow-lg shadow-cyan-500/10"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}
                    <span className="relative z-10">
                      <IconComponent className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'text-cyan-400 animate-pulse' : 'text-white/45 group-hover:text-white/80'}`} />
                    </span>
                  </button>
                );
              })}
              
              <div className="px-3.5 py-1 border-l border-white/15 relative z-10 hidden sm:flex items-center">
                <span className="text-[8px] font-black font-mono text-cyan-400/80 uppercase tracking-widest whitespace-nowrap animate-pulse">
                  {layout === 'panoramic' ? '3_PANEL' : layout === 'standard' ? 'DUAL_PANEL' : 'SOLO_PANEL'}
                </span>
              </div>
            </div>
          </div>
        )}

        <p className="text-[8px] sm:text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.4em] mt-2 bg-white/5 inline-block px-4 py-1.5 rounded-full border border-white/5">Strategic Response Matrix</p>
      </div>

      <div className="flex flex-row items-center gap-2 sm:gap-3 relative z-10 w-full md:w-auto mt-4 md:mt-0 flex-wrap">
        <button
          onClick={() => setIsFeatureMapOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all group shrink-0"
        >
          <MapIcon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] sm:text-[11px] font-black text-cyan-200 uppercase tracking-widest font-mono">WebLLM Map</span>
        </button>
        <button
          onClick={() => setIsAboutOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group hover:border-info/50 shrink-0"
        >
          <Info className="w-4 h-4 text-info group-hover:scale-110 transition-transform" />
          <span className="text-[9px] sm:text-[11px] font-black text-white/50 group-hover:text-white uppercase tracking-widest font-mono">MISSION</span>
        </button>
        <div className="flex-1 shrink-0">
          <ReviewArchivedLogsDrawer profile={profile} />
        </div>
      </div>
    </motion.div>
  );
}
