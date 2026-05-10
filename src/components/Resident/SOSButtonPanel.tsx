import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EmergencyType } from '../../types';
import { toast } from 'react-hot-toast';

interface SOSButtonPanelProps {
  isSending: boolean;
  guardianMode: boolean;
  setGuardianMode: (val: boolean) => void;
  onInitiateSOS: (type?: EmergencyType, desc?: string) => void;
}

export function SOSButtonPanel({ isSending, guardianMode, setGuardianMode, onInitiateSOS }: SOSButtonPanelProps) {
  return (
    <div className="relative max-w-2xl mx-auto mb-12">
      <div className="absolute -inset-4 border border-white/5 rounded-[64px] pointer-events-none opacity-50" />
      <div className="glass-panel border-white/10 rounded-[56px] p-10 md:p-20 relative overflow-hidden group shadow-[0_0_50px_rgba(0,0,0,0.5)] skew-card">
        <div className="absolute inset-0 tactical-grid opacity-10" />
        <div className="scanline opacity-20 pointer-events-none" />
        <div className="absolute inset-0 emergency-bg-glow opacity-5" />
        
        <div className="absolute top-6 left-6 md:top-10 md:left-10 flex flex-col gap-4 z-10 w-full md:w-auto">
          <div className="flex items-center justify-between md:justify-start gap-4 px-4 py-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md shadow-xl">
             <div className="flex flex-col">
                <span className="text-[7px] font-black tracking-[0.2em] text-white/40 uppercase mb-1">Guardian AI</span>
                <span className={cn("text-[10px] font-black tracking-wider transition-colors", guardianMode ? 'text-emergency' : 'text-white/50')}>
                  {guardianMode ? 'SYSTEM ACTIVE' : 'SYSTEM OFF'}
                </span>
             </div>
             <button 
              onClick={() => {
                  setGuardianMode(!guardianMode);
                  toast(!guardianMode ? 'Guardian AI Activated' : 'Guardian AI Disabled');
              }}
              className={cn("w-10 h-5 rounded-full p-0.5 transition-all duration-300 border border-white/10", guardianMode ? 'bg-emergency' : 'bg-black/20')}
             >
                <div className={cn("w-4 h-4 rounded-full bg-white transition-all shadow-lg", guardianMode ? 'translate-x-5' : 'translate-x-0')} />
             </button>
          </div>
        </div>

        <div className="relative flex flex-col items-center mt-12 md:mt-0">
            <motion.button
              whileHover={{ scale: isSending ? 1 : 1.05 }}
              whileTap={{ scale: isSending ? 1 : 0.95 }}
              animate={isSending ? {} : { 
                  boxShadow: [
                    "0 0 0 0 rgba(239, 68, 68, 0.4)",
                    "0 0 0 20px rgba(239, 68, 68, 0)",
                    "0 0 0 0 rgba(239, 68, 68, 0)"
                  ]
              }}
              transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut"
              }}
              onClick={() => onInitiateSOS('other', '')}
              disabled={isSending}
              className={cn(
                "relative z-10 w-52 h-52 md:w-72 md:h-72 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-[0_0_60px_rgba(239,68,68,0.3)] border-[8px]",
                isSending ? "bg-emergency/20 border-emergency animate-pulse" : "bg-emergency hover:bg-red-600 border-white/20 active:border-white shadow-glow-red"
              )}
            >
              <div className="absolute inset-2 rounded-full border border-white/10" />
              <Zap className={cn("w-16 h-16 md:w-28 md:h-28 text-white mb-2 filter drop-shadow-lg", isSending && "animate-bounce")} />
              <div className="flex flex-col items-center">
                <span className="text-4xl md:text-6xl font-black italic tracking-tighter text-white font-mono leading-none drop-shadow-md">S.O.S.</span>
                <span className="text-[11px] md:text-[14px] font-black tracking-[0.4em] text-white/70 mt-3 font-mono uppercase bg-black/20 px-4 py-1 rounded-full border border-white/5">Initiate</span>
              </div>
            </motion.button>
            <p className="mt-8 text-white/20 font-black tracking-[0.5em] text-[10px] font-mono uppercase bg-white/5 px-6 py-2 rounded-full border border-white/5 backdrop-blur-md">Tactical Emergency Signal</p>
        </div>
      </div>
    </div>
  );
}
