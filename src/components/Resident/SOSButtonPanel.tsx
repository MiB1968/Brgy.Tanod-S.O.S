import { motion } from 'motion/react';
import { Zap, Radio, Signal, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EmergencyType } from '../../types';
import { toast } from 'react-hot-toast';
import { TacticalCard } from '../Tactical/TacticalCard';
import { GuardianButton } from './GuardianButton';

import { useGuardianPassive } from '../../hooks/useGuardianPassive';
import { VoiceSOSButton } from './VoiceSOSButton';

interface SOSButtonPanelProps {
  isSending: boolean;
  guardianMode: boolean;
  setGuardianMode: (val: boolean) => void;
  onInitiateSOS: (type?: EmergencyType, desc?: string) => void;
}

export function SOSButtonPanel({ isSending, guardianMode, setGuardianMode, onInitiateSOS }: SOSButtonPanelProps) {
  const { isPassiveActive, isRecording, recordingDuration } = useGuardianPassive(
    guardianMode,
    (type, desc) => onInitiateSOS(type, desc)
  );

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const triggerSOS = (type: EmergencyType, desc: string) => {
    if (isSending) return;
    
    // Haptic Feedback for SOS Initiation
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
    
    onInitiateSOS(type, desc);
  };

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
                if ('vibrate' in navigator) navigator.vibrate(50);
                toast(!guardianMode ? 'Guardian AI Activated' : 'Guardian AI Disabled');
            }}
            className={cn("relative w-14 h-7 rounded-full p-1 transition-all duration-300 border border-tactical-cyan/30", guardianMode ? 'bg-tactical-cyan/20' : 'bg-tactical-dark')}
           >
              <div className={cn("w-5 h-5 rounded-full bg-white transition-all shadow-[0_0_10px_white]", guardianMode ? 'translate-x-7 bg-tactical-cyan' : 'translate-x-0 bg-white/50')} />
           </button>
        </div>

        {guardianMode && (
          <div className="flex items-center gap-2 px-4 py-1.5 -mt-2 mb-4 rounded-xl bg-black/30 border border-tactical-cyan/10 text-[11px] font-mono">
            <span className={`w-2 h-2 rounded-full animate-pulse ${isRecording ? 'bg-red-500' : 'bg-emerald-400'}`} />
            <span className={isRecording ? 'text-red-400' : 'text-emerald-400/80'}>
              {isRecording ? `Nire-record... ${formatDuration(recordingDuration)}` : 'Nakikinig...'}
            </span>
          </div>
        )}

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
            
            <div className="relative z-10 scale-90 md:scale-100">
               <GuardianButton 
                guardianMode={guardianMode}
                onInitiateSOS={() => triggerSOS('OTHER', 'General Emergency SOS')} 
               />
            </div>
        </div>

        {/* Specialized SOS Buttons */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerSOS('MEDICAL', 'Medical Emergency reported.')}
            disabled={isSending}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/40">
              <span className="text-white font-black text-xl">+</span>
            </div>
            <span className="text-[10px] font-black text-blue-400 tracking-widest uppercase">Medical</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerSOS('FIRE', 'Fire Emergency reported.')}
            disabled={isSending}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-orange-600/10 border border-orange-500/30 hover:bg-orange-600/20 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center shadow-lg group-hover:shadow-orange-500/40">
              <Zap className="text-white w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-orange-400 tracking-widest uppercase">Fire</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerSOS('CRIME', 'Criminal activity/Crime emergency reported.')}
            disabled={isSending}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-red-600/10 border border-red-500/30 hover:bg-red-600/20 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:shadow-red-500/40">
              <Shield className="text-white w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-red-400 tracking-widest uppercase">Crime</span>
          </motion.button>
        </div>

        <VoiceSOSButton onSOSReady={(type, desc) => onInitiateSOS(type, desc)} />

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
