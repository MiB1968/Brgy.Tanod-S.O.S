import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ShieldAlert, Zap, Flame, Eye, VolumeX, X, Radio } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface FloatingSOSButtonProps {
  onTrigger: (sosData: { type: string; description: string }) => void;
  role: string;
}

export default function FloatingSOSButton({ onTrigger, role }: FloatingSOSButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [slideProgress, setSlideProgress] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const slideTrackRef = useRef<HTMLDivElement>(null);

  // Haptic feedback assist helper
  const triggerHaptic = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const handleSOSConfirm = () => {
    if (!selectedType) return;
    
    // Extreme haptic burst for SOS confirmation
    triggerHaptic([300, 100, 300, 100, 500]);
    
    onTrigger({
      type: selectedType,
      description: `Emergency ${selectedType.toUpperCase()} triggered via Tactical HUD floating trigger.`
    });
    
    setIsConfirming(false);
    setIsOpen(false);
    setSelectedType(null);
    setSlideProgress(0);
  };

  // Touch/Mouse Slide handling for zero-pocket-dial validation
  const handleSlideStart = () => {
    setIsSliding(true);
    triggerHaptic(30);
  };

  const handleSlideMove = (clientX: number) => {
    if (!isSliding || !slideTrackRef.current) return;
    
    const rect = slideTrackRef.current.getBoundingClientRect();
    const width = rect.width - 64; // track width minus thumb width
    const currentX = Math.max(0, Math.min(clientX - rect.left - 32, width));
    
    const percentage = Math.round((currentX / width) * 100);
    setSlideProgress(percentage);
    
    // Gentle vibration as they slide closer to danger trigger
    if (percentage % 25 === 0 && percentage > 0) {
      triggerHaptic(10);
    }

    if (percentage >= 98) {
      setIsSliding(false);
      handleSOSConfirm();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches && e.touches[0]) {
      handleSlideMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleSlideMove(e.clientX);
  };

  const handleSlideEnd = () => {
    setIsSliding(false);
    if (slideProgress < 98) {
      // Bounce back to empty
      setSlideProgress(0);
      triggerHaptic(50);
    }
  };

  useEffect(() => {
    if (isSliding) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleSlideEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleSlideEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleSlideEnd);
    };
  }, [isSliding, slideProgress]);

  // Only render for resident users to avoid cluttered Tanod/Admin tactical layouts
  if (role !== 'resident') return null;

  const emergencyCategories = [
    { id: 'MEDICAL', label: 'Medical', icon: ShieldAlert, color: 'bg-blue-600 border-blue-500 hover:bg-blue-500' },
    { id: 'FIRE', label: 'Fire Outbreak', icon: Flame, color: 'bg-orange-600 border-orange-500 hover:bg-orange-500' },
    { id: 'CRIME', label: 'Crime Alert', icon: Zap, color: 'bg-red-600 border-red-500 hover:bg-red-500' },
    { id: 'FLOOD', label: 'Natural/Flood', icon: Radio, color: 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500' }
  ];

  return (
    <>
      {/* Flashing Floating Widget */}
      <div className="fixed bottom-6 right-6 z-[120]">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            setIsOpen(true);
            triggerHaptic([50, 50]);
          }}
          className="relative w-16 h-16 rounded-full bg-emergency border-2 border-white/20 flex items-center justify-center text-white shadow-[0_0_30px_rgba(239,68,68,0.6)] group overflow-hidden"
          id="floating-sos-action-btn"
        >
          {/* Pulsing Tactical Halo */}
          <span className="absolute inset-0 bg-red-500/30 rounded-full animate-ping pointer-events-none" />
          <ShieldAlert className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
          
          <div className="absolute top-0 left-0 w-full h-1 bg-white/20 animate-pulse" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="bg-[#0F1115] border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.15)] relative overflow-hidden"
            >
              {/* Tactical warning stripe on header */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
              
              <button 
                onClick={() => {
                  setIsOpen(false);
                  setIsConfirming(false);
                  setSelectedType(null);
                }}
                className="absolute top-4 right-4 text-white/40 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {!isConfirming ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-red-600/10 border border-red-500/20 rounded-2xl text-red-500">
                      <ShieldAlert className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black font-mono tracking-widest text-white uppercase italic">QUICK SOS HUD</h4>
                      <p className="text-[10px] text-white/40 font-mono">SELECT EMERGENCY PATTERN TO LAUNCH</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {emergencyCategories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedType(cat.id);
                            setIsConfirming(true);
                            triggerHaptic(80);
                          }}
                          className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-[#14171E] border border-white/5 hover:border-red-500/20 hover:bg-[#1C202B] transition-all relative group"
                        >
                          <div className="p-2.5 rounded-xl bg-white/5 text-white/80 group-hover:text-red-500 group-hover:scale-110 transition-transform">
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-black font-mono uppercase tracking-[0.1em] text-white/70">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[9px] text-center text-white/30 font-mono uppercase tracking-wider mt-2 italic">
                    All dispatches log GPS Coordinates, real-time telemetry, & alert patrolling Tanods.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <button 
                      onClick={() => {
                        setIsConfirming(false);
                        setSelectedType(null);
                        setSlideProgress(0);
                        triggerHaptic(50);
                      }}
                      className="text-white/40 hover:text-white text-[10px] font-black font-mono tracking-widest uppercase border border-white/5 px-2.5 py-1 rounded bg-[#14171E] transition-all"
                    >
                      ← Back
                    </button>
                    <div className="ml-auto text-right">
                      <span className="text-[8px] font-bold text-red-500 font-mono tracking-widest block">CONFIRMING</span>
                      <span className="text-xs font-black text-white font-mono tracking-wider uppercase">{selectedType} REPORT</span>
                    </div>
                  </div>

                  <div className="p-4 bg-red-600/5 border border-red-600/20 rounded-2xl mb-8 flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                      <ShieldAlert className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-xs font-black font-mono tracking-widest text-white uppercase">SLIDE TO VALIDATE</h5>
                      <p className="text-[10px] text-white/50 max-w-[240px] leading-relaxed mx-auto">
                        This validates your safety alert and dispatch failovers to responsive Tanod responders.
                      </p>
                    </div>
                  </div>

                  {/* Swipe to Confirm Element */}
                  <div 
                    ref={slideTrackRef}
                    className="h-16 w-full bg-[#14171E] rounded-full border border-white/5 relative overflow-hidden select-none p-1.5 flex items-center justify-center"
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleSlideEnd}
                  >
                    <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] sm:text-xs font-black font-mono tracking-widest uppercase text-white/10 animate-pulse">
                        SLIDE TO SEND SOS {" >>> "}
                      </span>
                    </div>

                    {/* Progress Bar background color */}
                    <div 
                      className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-red-600/10 via-red-600/30 to-red-600/50 rounded-full transition-all"
                      style={{ width: `${slideProgress}%` }}
                    />

                    {/* Slide Thumb */}
                    <div
                      className="absolute left-1.5 w-12 h-12 rounded-full cursor-grab active:cursor-grabbing bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-lg transition-transform"
                      style={{ 
                        transform: `translateX(${((slideTrackRef.current?.getBoundingClientRect().width || 0) - 64) * (slideProgress / 100)}px)`
                      }}
                      onTouchStart={handleSlideStart}
                      onMouseDown={handleSlideStart}
                    >
                      <ShieldAlert className="w-5 h-5 animate-pulse" />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[8px] font-black font-mono tracking-[0.25em] text-red-500 uppercase">SYSTEM_SECURED</span>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
