
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Waves, Shield, Bot, Info } from 'lucide-react';
import { useGuardianAI } from '../../hooks/useGuardianAI';
import { audioUtils } from '../../lib/audio';

export const GuardianVoiceAssistant: React.FC = () => {
  const { isListening, isSpeaking, toggleListening } = useGuardianAI();
  const [visualData, setVisualData] = useState<Uint8Array>(new Uint8Array(32));

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
        .catch(err => console.error('Access denied for tactical audio analysis', err));
    } else {
      setVisualData(new Uint8Array(32));
    }

    return () => {
      visualizer?.stop();
    };
  }, [isListening]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4">
      {/* Interaction Feedback Bubble */}
      <AnimatePresence>
        {(isListening || isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="bg-slate-900/90 backdrop-blur-md border border-blue-500/30 p-4 rounded-2xl shadow-2xl max-w-xs"
          >
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
              <div>
                <p className="text-xs font-mono text-blue-400 uppercase tracking-tighter">Guardian AI Intelligence</p>
                <div className="flex items-center gap-1 mt-1">
                  {isListening ? (
                    <div className="flex gap-0.5 h-3 items-end">
                      {Array.from(visualData.slice(0, 8)).map((val, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: `${(val / 255) * 100}%` }}
                          className="w-1 bg-blue-400 rounded-full"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-white truncate">Responding...</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Trigger Button */}
      <motion.button
        id="guardian-ai-trigger"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleListening}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 relative group
          ${isListening ? 'bg-red-500 shadow-red-500/40' : 'bg-blue-600 shadow-blue-500/40 hover:bg-blue-500'}
        `}
      >
        {isListening ? (
          <MicOff className="text-white group-hover:scale-110 transition-transform" size={24} />
        ) : (
          <Mic className="text-white group-hover:scale-110 transition-transform" size={24} />
        )}

        {/* Glow Rings */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 border-2 border-blue-400 rounded-full pointer-events-none"
            />
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
