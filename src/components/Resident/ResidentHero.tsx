import { Dispatch, SetStateAction } from 'react';
import { motion } from 'motion/react';
import { Info, Shield } from 'lucide-react';
import { TanodLogo } from '../Branding';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface ResidentHeroProps {
  profile: User;
  setIsAboutOpen: (open: boolean) => void;
  guardianMode: boolean;
  setGuardianMode: Dispatch<SetStateAction<boolean>>;
}

export function ResidentHero({ profile, setIsAboutOpen, guardianMode, setGuardianMode }: ResidentHeroProps) {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-6 mb-10 relative glass-panel p-8 rounded-[48px] border-white/10 skew-card overflow-hidden">
      <div className="scanline opacity-20 pointer-events-none" />
      <div className="tactical-bg-glow absolute inset-0 rounded-[48px] pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-info animate-pulse shadow-[0_0_8px_#3b82f6]" />
          <span className="text-[9px] font-mono text-info font-black uppercase tracking-[0.4em]">Resident Security Status: Verified</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase text-white font-mono leading-none flex items-center gap-4 outline-text">
          <TanodLogo size={48} animated={true} />
          PROTECT<span className="text-info">LOCAL</span>
        </h2>
        <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em] mt-3 bg-white/5 inline-block px-3 py-1 rounded-full border border-white/5">Personal Safety & Emergency Transmission Terminal</p>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <button
          onClick={() => {
            setGuardianMode(!guardianMode);
            toast(!guardianMode ? 'Guardian AI Activated' : 'Guardian AI Disabled');
          }}
          className={cn("w-40 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border transition-all animate-pulse-slow", guardianMode ? 'bg-emergency/20 border-emergency/50 hover:bg-emergency/30' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20')}
        >
          <Shield className={cn("w-4 h-4 transition-colors", guardianMode ? 'text-emergency' : 'text-white/40 group-hover:text-white')} />
          <div className="flex flex-col items-start pr-2">
            <span className="text-[7px] font-black tracking-[0.2em] text-white/40 uppercase">Guardian AI</span>
            <span className={cn("text-[9px] font-black transition-colors", guardianMode ? 'text-emergency' : 'text-white/60')}>
              {guardianMode ? 'SYSTEM ACTIVE' : 'SYSTEM OFF'}
            </span>
          </div>
        </button>
        <button
          onClick={() => setIsAboutOpen(true)}
          className="w-40 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
        >
          <Info className="w-4 h-4 text-white/40 group-hover:text-white" />
          <span className="text-[10px] font-bold text-white/40 group-hover:text-white uppercase tracking-widest font-mono">APP BRIEF</span>
        </button>
      </div>
    </motion.div>
  );
}
