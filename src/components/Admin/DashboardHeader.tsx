import { motion } from 'motion/react';
import { Info } from 'lucide-react';
import { TanodLogo } from '../Branding';
import { ReviewArchivedLogsDrawer } from '../Admin/ReviewArchivedLogsDrawer';
import { User } from '../../types';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

interface DashboardHeaderProps {
  profile: User | null;
  setIsAboutOpen: (open: boolean) => void;
}

export function DashboardHeader({ profile, setIsAboutOpen }: DashboardHeaderProps) {
  return (
    <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-6 mb-10 relative glass-panel p-8 rounded-[48px] border-white/10 skew-card">
      <div className="scanline opacity-20 pointer-events-none" />
      <div className="tactical-bg-glow absolute inset-0 rounded-[48px] pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-emergency animate-pulse" />
          <span className="text-[10px] font-mono text-emergency font-black uppercase tracking-[0.4em]">Signal: Secure Encryption Active</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-white font-mono leading-none flex items-center flex-wrap gap-4 outline-text">
          <TanodLogo size={64} animated={true} className="text-emergency shadow-glow-red shrink-0" />
          <div className="flex flex-col">
            <span className="flex items-center">COMMAND<span className="text-emergency">CENTER</span></span>
            <span className="text-[10px] font-black tracking-[0.5em] text-white/20 -mt-1 ml-1">ADMIN_PANEL_v2</span>
          </div>
        </h2>
        <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.4em] mt-4 bg-white/5 inline-block px-4 py-1.5 rounded-full border border-white/5">Strategic Surveillance & Tactical Response Matrix</p>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <button
          onClick={() => setIsAboutOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group hover:border-info/50"
        >
          <Info className="w-4 h-4 text-info group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-black text-white/50 group-hover:text-white uppercase tracking-widest font-mono">MISSION BRIEF</span>
        </button>
        <ReviewArchivedLogsDrawer profile={profile} />
      </div>
    </motion.div>
  );
}
