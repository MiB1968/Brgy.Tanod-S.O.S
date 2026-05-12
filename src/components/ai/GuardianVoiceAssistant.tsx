
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Mic, MicOff, Waves, Shield, Bot, Info } from 'lucide-react';
import { TanodLogo } from '../Branding';
import { toast } from 'react-hot-toast';
import { useGuardian } from '../../hooks/useGuardian';
import { audioUtils } from '../../lib/audio';

export const GuardianVoiceAssistant: React.FC = () => {
  const { 
    status, 
    transcript, 
    isListening, 
    startListening, 
    stopListening, 
    speak 
  } = useGuardian();

  const isSpeaking = status === 'RESPONDING';
  const isProcessing = status === 'PROCESSING';

  const [visualData, setVisualData] = useState<Uint8Array>(new Uint8Array(32));
  const [isDraggable, setIsDraggable] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const dragControls = useDragControls();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Visualizer logic
  useEffect(() => {
    let visualizer: { stop: () => void } | null = null;
    
    if (isListening) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          visualizer = audioUtils.createVisualizer(stream, (data) => {
            setVisualData(data);
          });
        })
        .catch(err => {
          console.error('Access denied for tactical audio analysis', err);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            toast.error("Tactical analysis requires microphone access.", { id: 'mic-denied' });
          }
        });
    } else {
      setVisualData(new Uint8Array(32));
    }

    return () => {
      visualizer?.stop();
    };
  }, [isListening]);

  useEffect(() => {
    if (showChat && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showChat]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      // In a real enterprise app, we'd have a separate text processInput
      // For now, we'll use the speak response logic with a manual text trigger
      // Note: useGuardian's processInput logic is private to the hook's internal listeners,
      // but we can expose it if needed or just handle simple speak here.
      toast("Text command received", { icon: '⌨️' });
      setChatInput('');
      setShowChat(false);
    }
  };

  const startLongPressTimer = (e: React.PointerEvent) => {
    // Prevent default to avoid side effects on some mobile browsers
    longPressTimer.current = setTimeout(() => {
      setIsDraggable(true);
      // Immediately start the drag process
      dragControls.start(e);
      if (window.navigator?.vibrate) window.navigator.vibrate([40, 30, 40]);
      toast("Tactical repositioning active", { 
        id: 'drag-toast',
        icon: '🎯', 
        duration: 2000,
        style: { background: '#0f172a', color: '#60a5fa', border: '1px solid #3b82f6' }
      });
    }, 800);
  };

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <motion.div 
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onDragStart={() => setIsDraggable(true)}
      onDragEnd={() => {
        setIsDraggable(false);
        clearLongPressTimer();
      }}
      className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 touch-none"
      style={{ x: 0, y: 0 }} // Initialize with 0 to prevent jumping
    >
      {/* Interaction Feedback Bubble & Chat Input */}
      <AnimatePresence>
        {(isListening || isSpeaking || showChat) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="bg-slate-900/95 backdrop-blur-md border border-blue-500/30 p-4 rounded-2xl shadow-2xl w-72 mb-2"
          >
            {showChat ? (
              <form onSubmit={handleChatSubmit} className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Issue command..."
                  className="w-full bg-slate-800 border-b border-blue-500/50 text-white text-sm py-2 px-3 focus:outline-none focus:border-blue-400 font-mono"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-2 text-blue-400 hover:text-blue-300"
                >
                  <Bot size={18} />
                </button>
                <p className="text-[9px] text-blue-400/50 mt-2 font-mono uppercase tracking-widest">Text Terminal Active</p>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-blue-600/20 text-blue-400 ${isSpeaking ? 'animate-pulse' : ''}`}>
                    <Bot size={20} />
                  </div>
                  {isSpeaking && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="absolute -inset-1 border border-blue-400 rounded-full"
                    />
                  )}
                </div>
                <div className="min-w-[120px]">
                  <p className="text-xs font-mono text-blue-400 uppercase tracking-tighter">
                    {status === 'LISTENING' ? 'Listening...' : status === 'PROCESSING' ? 'Thinking...' : 'Guardian Assistant'}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {isListening ? (
                      <div className="flex flex-col gap-1 w-full">
                        <p className="text-[10px] text-white/70 italic truncate">
                          "{transcript || 'Waiting for audio...'}"
                        </p>
                        <div className="flex gap-0.5 h-3 items-end">
                          {Array.from(visualData.slice(0, 8)).map((val, i) => (
                            <motion.div
                              key={i}
                              animate={{ height: `${Math.max(2, (val / 255) * 100)}%` }}
                              className="w-1 bg-blue-400 rounded-full"
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-white truncate">Responding...</p>
                        {isSpeaking && (
                           <motion.p 
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1 }}
                             className="text-[9px] text-blue-400/80 font-mono italic"
                           >
                             "Try asking: Summarize incidents"
                           </motion.p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        {/* Chat Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowChat(!showChat)}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-all
            ${showChat ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-blue-500/30 text-blue-400'}
          `}
        >
          <Bot size={20} />
        </motion.button>

        {/* Main AI Trigger */}
        <motion.button
          id="guardian-ai-trigger"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          animate={{
            boxShadow: isListening 
              ? [
                  "0 0 0px rgba(239, 68, 68, 0.5)", 
                  "0 0 40px rgba(239, 68, 68, 0.9)", 
                  "0 0 0px rgba(239, 68, 68, 0.5)"
                ]
              : [
                  "0 0 15px rgba(56, 189, 248, 0.3)", 
                  "0 0 60px rgba(56, 189, 248, 0.8)", 
                  "0 0 15px rgba(56, 189, 248, 0.3)"
                ],
            opacity: isListening ? 1 : 0.85
          }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          onPointerDown={startLongPressTimer}
          onPointerUp={clearLongPressTimer}
          onPointerLeave={clearLongPressTimer}
          onClick={(e) => {
            if (isDraggable) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            if (isListening) stopListening();
            else startListening();
          }}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative group
            ${isListening ? 'bg-red-500/70 ring-4 ring-red-500/20' : 'bg-sky-500/60 hover:bg-sky-400/70 ring-4 ring-sky-400/20'}
            ${isDraggable ? 'cursor-grabbing ring-white scale-110' : 'cursor-pointer'}
          `}
        >
          {/* Inner Glow Core */}
          <div className={`absolute inset-0 rounded-full blur-md opacity-50 bg-sky-400 ${isListening ? 'bg-red-400' : ''}`} />
          
          <TanodLogo size={36} animated={isListening} className={isListening ? "animate-pulse" : "relative z-10"} />

          {/* Epic Pulsing Rings */}
          <AnimatePresence>
            {(isSpeaking || isListening) && (
              <>
                <motion.div
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                  className={`absolute inset-0 border-2 ${isListening ? 'border-red-400' : 'border-sky-400'} rounded-full pointer-events-none`}
                />
                <motion.div
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.5 }}
                  className={`absolute inset-0 border border-sky-300 rounded-full pointer-events-none`}
                />
              </>
            )}
            {!isListening && !isSpeaking && (
               <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.1, 0.3]
                }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="absolute inset-0 bg-sky-400 rounded-full blur-xl pointer-events-none"
              />
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
};
