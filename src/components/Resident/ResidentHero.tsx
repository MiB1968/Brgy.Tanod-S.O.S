import { Dispatch, SetStateAction } from 'react';
import { motion } from 'motion/react';
import { Info, Shield } from 'lucide-react';
import { TanodLogo } from '../Branding';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { TacticalButton } from '../Tactical/TacticalButton';

interface ResidentHeroProps {
  profile: User;
  setIsAboutOpen: (open: boolean) => void;
  guardianMode: boolean;
  setGuardianMode: Dispatch<SetStateAction<boolean>>;
}

export function ResidentHero({ profile, setIsAboutOpen, guardianMode, setGuardianMode }: ResidentHeroProps) {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-6 mb-10 relative tactical-panel p-8 rounded-[48px] tactical-grid overflow-hidden border-cyan-400/20">
      <div className="absolute inset-0 bg-gradient-to-br from-tactical-dark via-transparent to-tactical-blue/5 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-tactical-cyan animate-pulse shadow-[0_0_8px_var(--color-tactical-cyan)]" />
          <span className="text-[9px] font-mono text-tactical-cyan font-black uppercase tracking-[0.4em]">Resident Security Status: Verified</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase text-white font-display leading-none flex items-center gap-4">
          <TanodLogo size={48} animated={true} />
          PROTECT<span className="text-tactical-blue">LOCAL</span>
        </h2>
        <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em] mt-3 bg-white/5 inline-block px-3 py-1 rounded-full border border-white/10">Personal Safety & Emergency Transmission Terminal</p>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <TacticalButton
          onClick={() => {
            setGuardianMode(!guardianMode);
            toast(!guardianMode ? 'Guardian AI Activated' : 'Guardian AI Disabled');
          }}
          label=""
          className={cn("w-40 flex items-center justify-center gap-3", guardianMode ? 'bg-emergency/20 border-emergency/50 hover:bg-emergency/30' : '')}
        >
          <Shield className={cn("w-4 h-4 transition-colors", guardianMode ? 'text-emergency' : 'text-tactical-cyan')} />
          <div className="flex flex-col items-start pr-2">
            <span className="text-[7px] font-black tracking-[0.2em] text-white/40 uppercase">Guardian AI</span>
            <span className={cn("text-[9px] font-black transition-colors", guardianMode ? 'text-emergency' : 'text-tactical-cyan')}>
              {guardianMode ? 'SYSTEM ACTIVE' : 'SYSTEM OFF'}
            </span>
          </div>
        </TacticalButton>
        <TacticalButton
          onClick={() => setIsAboutOpen(true)}
          label="APP BRIEF"
          className="w-40 flex items-center justify-center gap-2"
        >
          <Info className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono">APP BRIEF</span>
        </TacticalButton>
      </div>
    </motion.div>
  );
}
