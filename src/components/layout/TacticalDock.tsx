import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Mic, Volume2, ChevronRight, Menu, Info, HelpCircle } from 'lucide-react';
import { useRBAC } from '../../context/AuthContext';

export default function TacticalDock() {
  const { role } = useRBAC();
  const [isOpen, setIsOpen] = useState(true);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isSirenActive, setIsSirenActive] = useState(false);

  // Vibe haptic trigger helper
  const triggerHaptic = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // Monitor for voice assistant activation state
  useEffect(() => {
    const handleVoiceChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setIsVoiceActive(!!customEvent.detail.isListening);
      }
    };
    
    // We can also infer active listening state
    window.addEventListener('voice-assistant-change', handleVoiceChange);
    return () => {
      window.removeEventListener('voice-assistant-change', handleVoiceChange);
    };
  }, []);

  // Monitor for global siren activation state
  useEffect(() => {
    const handleSirenChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail) {
        setIsSirenActive(!!customEvent.detail.active);
      }
    };
    window.addEventListener('siren-state-change', handleSirenChange);
    return () => {
      window.removeEventListener('siren-state-change', handleSirenChange);
    };
  }, []);

  const handleOpenGuardianChat = () => {
    triggerHaptic(50);
    window.dispatchEvent(new CustomEvent('open-guardian-chat'));
  };

  const handleToggleVoiceAssistant = () => {
    triggerHaptic([60, 40]);
    window.dispatchEvent(new CustomEvent('toggle-voice-assistant'));
    setIsVoiceActive(prev => !prev);
  };

  const handleToggleSiren = () => {
    triggerHaptic([30, 20]);
    window.dispatchEvent(new CustomEvent('toggle-siren'));
  };

  return (
    <>
      {/* MINIMIZED SLIDING TRIGGER HANDLE */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            whileHover={{ scale: 1.1, x: -2 }}
            onClick={() => {
              setIsOpen(true);
              triggerHaptic(40);
            }}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[400] flex items-center justify-center 
                       w-8 h-20 rounded-l-2xl bg-gradient-to-b from-[#1E293B] to-[#0F172A] 
                       border border-white/10 border-r-0 shadow-[0_0_20px_rgba(30,41,59,0.5)] group overflow-hidden"
            title="Expand Tactical Utilities Panel"
            id="tactical-dock-expand-handle"
          >
            {/* Pulsing neon strip */}
            <div className="absolute left-1 top-2 bottom-2 w-1 rounded bg-sky-500 animate-pulse group-hover:bg-amber-400 group-hover:scale-y-115 transition-all" />
            <span className="text-[10px] text-white/50 tracking-widest font-mono font-black uppercase origin-center rotate-90 scale-85 whitespace-nowrap">
              PANEL
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* FULL EXPANDED DOCK TRAY (ANDROID EDGE PANEL DESIGN) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            className="fixed right-1 top-1/2 -translate-y-1/2 z-[400] flex items-center gap-1.5"
            id="tactical-dock-tray-container"
          >
            {/* Grab / Collapse Tag */}
            <button
              onClick={() => {
                setIsOpen(false);
                triggerHaptic(30);
              }}
              className="w-5 h-20 rounded-l-xl bg-slate-900/60 backdrop-blur-md border border-white/5 border-r-0 flex items-center justify-center hover:bg-slate-800 text-white/40 hover:text-white transition-colors"
              title="Minimize Edge Panel"
            >
              <ChevronRight size={14} className="animate-pulse" />
            </button>

            {/* Main Tray Capsule */}
            <div className="w-20 py-5 bg-[#0F172A]/75 backdrop-blur-2xl border border-white/10 rounded-2xl flex flex-col items-center gap-5 shadow-[0_0_40px_rgba(15,23,42,0.8)] relative overflow-hidden">
              {/* Sleek cyber backdrop lines */}
              <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b from-blue-500/20 via-red-500/20 to-purple-500/20 pointer-events-none" />
              
              {/* Header Title Accent */}
              <div className="text-[8px] font-black font-mono tracking-widest text-[#64748B] uppercase italic mb-1">
                S.O.S.
              </div>

              {/* 1. GUARDIAN AI CHAT TRIGGER */}
              <div className="flex flex-col items-center gap-1 w-full text-center group">
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleOpenGuardianChat}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 
                             flex items-center justify-center text-white shadow-[0_0_15px_rgba(147,51,234,0.4)] 
                             border border-white/20 overflow-hidden"
                  title="Open Guardian AI Chat"
                  id="tactical-dock-chat-btn"
                >
                  <Bot size={22} className="group-hover:rotate-12 transition-transform" />
                </motion.button>
                <span className="text-[8px] font-black font-mono tracking-widest text-indigo-400 uppercase select-none">
                  CHAT
                </span>
              </div>

              {/* 3. GUARDIAN VOICE ASSISTANT MIC TRIGGER */}
              <div className="flex flex-col items-center gap-1 w-full text-center group">
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleToggleVoiceAssistant}
                  animate={isVoiceActive ? {
                    boxShadow: [
                      "0 0 10px rgba(56, 189, 248, 0.4)",
                      "0 0 25px rgba(56, 189, 248, 0.8)",
                      "0 0 10px rgba(56, 189, 248, 0.4)"
                    ]
                  } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/20 overflow-hidden transition-all
                    ${isVoiceActive 
                      ? 'bg-gradient-to-br from-sky-500 via-blue-600 to-sky-400 text-white' 
                      : 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-sky-400 hover:text-white'
                    }
                  `}
                  title="Toggle Guardian Voice mic"
                  id="tactical-dock-voice-btn"
                >
                  {isVoiceActive ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      <Mic size={22} />
                    </motion.div>
                  ) : (
                    <Mic size={22} />
                  )}
                </motion.button>
                <span className="text-[8px] font-black font-mono tracking-widest text-sky-400 uppercase select-none">
                  {isVoiceActive ? 'ACTIVE' : 'VOICE'}
                </span>
              </div>

              {/* 4. SIREN TRIGGER */}
              <div className="flex flex-col items-center gap-1 w-full text-center group">
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleToggleSiren}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/20 overflow-hidden transition-all duration-300
                    ${isSirenActive 
                      ? 'bg-gradient-to-br from-red-600 via-rose-500 to-red-800 text-white shadow-[0_0_20px_rgba(239,68,68,0.7)]' 
                      : 'bg-gradient-to-br from-amber-600 via-orange-500 to-amber-700 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    }
                  `}
                  title="Toggle Siren Alarm"
                  id="tactical-dock-siren-btn"
                >
                  {isSirenActive ? (
                    <motion.div
                      animate={{ scale: [1, 1.25, 1], rotate: [0, -10, 10, -10, 10, 0] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      <Volume2 size={22} />
                    </motion.div>
                  ) : (
                    <Volume2 size={22} className="group-hover:animate-bounce" />
                  )}
                </motion.button>
                <span className={`text-[8px] font-black font-mono tracking-widest uppercase select-none ${isSirenActive ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                  {isSirenActive ? 'SIREN_ON' : 'SIREN'}
                </span>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
