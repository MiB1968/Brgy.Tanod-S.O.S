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
        
        <div className="absolute top-10 left-10 flex flex-col gap-4 z-10">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
             <div className="flex flex-col min-w-[50px]">
                <span className="text-[6px] font-black tracking-[0.2em] text-white/30 uppercase mb-1">Guardian AI</span>
                <span className={cn("text-[9px] font-black", guardianMode ? 'text-emergency' : 'text-white/40')}>
                  {guardianMode ? 'LISTENING' : 'OFF'}
                </span>
             </div>
             <button 
              onClick={() => {
                  setGuardianMode(!guardianMode);
                  toast(!guardianMode ? 'Guardian AI Activated' : 'Guardian AI Disabled');
              }}
              className={cn("w-8 h-4 rounded-full p-0.5 transition-all duration-300", guardianMode ? 'bg-emergency' : 'bg-white/10')}
             >
                <div className={cn("w-3 h-3 rounded-full bg-white transition-all shadow-md", guardianMode ? 'translate-x-3.5' : 'translate-x-0')} />
             </button>
          </div>
        </div>

        <div className="relative flex flex-col items-center">
            <motion.button
              whileHover={{ scale: isSending ? 1 : 1.05 }}
              whileTap={{ scale: isSending ? 1 : 0.95 }}
              onClick={() => onInitiateSOS('other', '')}
              disabled={isSending}
              className={cn(
                "relative z-10 w-48 h-48 md:w-64 md:h-64 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl",
                isSending ? "bg-emergency/20 border-emergency animate-pulse" : "bg-emergency hover:bg-red-600 border-4 border-white/20 active:border-white shadow-glow-red"
              )}
            >
              <Zap className={cn("w-16 h-16 md:w-24 md:h-24 text-white mb-2", isSending && "animate-bounce")} />
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-5xl font-black italic tracking-tighter text-white font-mono leading-none">S.O.S.</span>
                <span className="text-[10px] md:text-[12px] font-black tracking-[0.4em] text-white/60 mt-2 font-mono uppercase">Initiate</span>
              </div>
            </motion.button>
            <p className="mt-8 text-white/20 font-black tracking-[0.5em] text-[10px] font-mono uppercase bg-white/5 px-6 py-2 rounded-full border border-white/5 backdrop-blur-md">Tactical Emergency Signal</p>
        </div>
      </div>
    </div>
  );
}
