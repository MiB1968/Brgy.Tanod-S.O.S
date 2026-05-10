import { motion } from 'motion/react';
import { Zap, Radio, Signal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EmergencyType } from '../../types';
import { toast } from 'react-hot-toast';
import { TacticalCard } from '../Tactical/TacticalCard';

interface SOSButtonPanelProps {
  isSending: boolean;
  guardianMode: boolean;
  setGuardianMode: (val: boolean) => void;
  onInitiateSOS: (type?: EmergencyType, desc?: string) => void;
}

export function SOSButtonPanel({ isSending, guardianMode, setGuardianMode, onInitiateSOS }: SOSButtonPanelProps) {
  return (
    <div className="relative max-w-2xl mx-auto mb-12">
      <TacticalCard className="p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* Toggle Bar */}
        <div className="flex items-center justify-between mb-12 px-6 py-4 rounded-2xl bg-tactical-dark border border-tactical-cyan/30 backdrop-blur-md shadow-inner">
           <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black tracking-[0.2em] text-tactical-cyan/80 uppercase">Guardian AI</span>
              <div className="flex items-center gap-2">
                 <div className={cn("w-2 h-2 rounded-full animate-pulse", guardianMode ? 'bg-tactical-cyan shadow-[0_0_8px_var(--color-tactical-cyan)]' : 'bg-white/20')} />
                 <span className={cn("text-[12px] font-black tracking-wider transition-colors", guardianMode ? 'text-tactical-cyan' : 'text-white/50')}>
                   {guardianMode ? 'SYSTEM ONLINE' : 'SYSTEM STANDBY'}
                 </span>
              </div>
           </div>
           <button 
            onClick={() => {
                setGuardianMode(!guardianMode);
                toast(!guardianMode ? 'Guardian AI Activated' : 'Guardian AI Disabled');
            }}
            className={cn("relative w-14 h-7 rounded-full p-1 transition-all duration-300 border border-tactical-cyan/30", guardianMode ? 'bg-tactical-cyan/20' : 'bg-tactical-dark')}
           >
              <div className={cn("w-5 h-5 rounded-full bg-white transition-all shadow-[0_0_10px_white]", guardianMode ? 'translate-x-7 bg-tactical-cyan' : 'translate-x-0 bg-white/50')} />
           </button>
        </div>

        <div className="relative flex flex-col items-center">
            {/* Rotating Ring Container */}
            <motion.div 
               animate={{ rotate: 360 }}
               transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
               className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-dashed border-tactical-cyan/20 shadow-[0_0_30px_rgba(0,240,255,0.1)]"
            />
            {/* Pulsing Outer Ring */}
            <motion.div 
               animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
               transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
               className="absolute w-56 h-56 md:w-72 md:h-72 rounded-full border-2 border-tactical-blue/30"
            />
            
            <motion.button
              whileHover={{ scale: isSending ? 1 : 1.05 }}
              whileTap={{ scale: isSending ? 1 : 0.95 }}
              onClick={() => onInitiateSOS('other', '')}
              disabled={isSending}
              className={cn(
                "relative z-10 w-52 h-52 md:w-64 md:h-64 rounded-full flex flex-col items-center justify-center transition-all duration-500 border-[8px] backdrop-blur-xl shadow-[0_0_60px_rgba(255,59,92,0.4)]",
                isSending ? "bg-emergency/20 border-emergency animate-pulse" : "bg-gradient-to-tr from-tactical-dark via-emergency/20 to-tactical-cyan/20 border-tactical-red/50 hover:border-tactical-cyan/80 active:border-white"
              )}
            >
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,59,92,0.2),transparent)] opacity-50" />
              <Zap className={cn("w-16 h-16 md:w-24 md:h-24 text-white mb-2 filter drop-shadow-lg", isSending && "animate-bounce")} />
              <div className="flex flex-col items-center">
                <span className="text-4xl md:text-5xl font-black italic tracking-tighter text-white font-display leading-none drop-shadow-md">S.O.S.</span>
                <span className="text-[10px] md:text-[12px] font-black tracking-[0.4em] text-white/70 mt-3 font-mono uppercase bg-black/40 px-4 py-1 rounded-full border border-white/10">INITIATE</span>
              </div>
            </motion.button>
        </div>

        {/* Footer Bar */}
        <div className="mt-12 flex items-center justify-center gap-4 bg-tactical-dark border border-tactical-cyan/20 rounded-full py-4 text-tactical-cyan/60">
           <Signal className="w-4 h-4" />
           <p className="font-black tracking-[0.5em] text-[10px] font-mono uppercase">Tactical Emergency Signal</p>
           <Radio className="w-4 h-4" />
        </div>
      </TacticalCard>
    </div>
  );
}
