// src/components/ai/GuardianAILoader.tsx

import React from 'react';
import { motion } from 'motion/react';
import { Loader2, ShieldAlert, Cpu } from 'lucide-react';

interface GuardianAILoaderProps {
  progress: number;
  message: string;
  onDismiss?: () => void;
}

export const GuardianAILoader: React.FC<GuardianAILoaderProps> = ({ 
  progress, 
  message, 
  onDismiss 
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-slate-900 border border-emerald-500/20 rounded-3xl p-6 shadow-2xl relative"
        id="guardian-ai-loader-container"
      >
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full border border-white/5">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono font-bold text-emerald-400">LOCAL AI ENGINE</span>
        </div>

        <div className="text-center mt-4">
          <div className="mx-auto mb-6 relative w-16 h-16 flex items-center justify-center">
            <Loader2 className="w-16 h-16 animate-spin text-emerald-500 absolute" />
            <motion.div 
              animate={{ scale: [0.95, 1.1, 0.95] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold"
            >
              Tanod
            </motion.div>
          </div>
          
          <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
            Sinisimulan ang Guardian AI...
          </h3>
          <p className="text-xs text-zinc-400/80 mt-1 max-w-[320px] mx-auto font-mono">
            Optimizing emergency offline model weights for slow phones
          </p>
          
          <div className="mt-6 bg-slate-950/60 border border-white/5 rounded-xl px-4 py-3 text-left">
            <p className="text-[11px] font-mono text-zinc-400 capitalize truncate h-4">
              Status: {message || 'Inihahanda ang model cache...'}
            </p>
          </div>

          <div className="mt-6 w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mt-2">
            <span>{Math.round(progress * 100)}% custom-cached</span>
            <span>0.5B Parameter Model</span>
          </div>

          <div className="mt-8 flex flex-col gap-2">
            <div className="flex gap-2 items-start text-xs text-yellow-400/80 bg-yellow-500/5 px-4 py-3 rounded-xl border border-yellow-500/10 text-left">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-tight text-[11px]">
                <strong>Babala:</strong> Mangyaring huwag isara ang app habang tinatapos ang unang download para magamit ito nang offline.
              </p>
            </div>

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="mt-2 text-[11px] text-zinc-500 hover:text-zinc-400 font-mono tracking-wide underline cursor-pointer"
              >
                Gumamit muna ng Server Fallback
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
