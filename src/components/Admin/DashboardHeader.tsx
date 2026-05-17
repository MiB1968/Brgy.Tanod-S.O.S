import { motion } from 'motion/react';
import { Info } from 'lucide-react';
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
}

export function DashboardHeader({ profile, setIsAboutOpen }: DashboardHeaderProps) {
  return (
    <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-6 mb-10 relative glass-panel p-6 sm:p-8 rounded-[32px] sm:rounded-[48px] border-white/10 skew-card shadow-2xl">
      <div className="scanline opacity-20 pointer-events-none" />
      <div className="tactical-bg-glow absolute inset-0 rounded-[32px] sm:rounded-[48px] pointer-events-none" />
      
      <div className="relative z-10 w-full flex flex-col items-start gap-4">
        <div className="flex items-center justify-between w-full h-8">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emergency animate-pulse" />
            <span className="text-[8px] sm:text-[10px] font-mono text-emergency font-black uppercase tracking-[0.2em] sm:tracking-[0.4em]">Signal: Secure Encryption Active</span>
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
        <p className="text-[8px] sm:text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.4em] mt-2 bg-white/5 inline-block px-4 py-1.5 rounded-full border border-white/5">Strategic Response Matrix</p>
      </div>

      <div className="flex flex-row items-center gap-2 sm:gap-3 relative z-10 w-full md:w-auto mt-4 md:mt-0">
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
