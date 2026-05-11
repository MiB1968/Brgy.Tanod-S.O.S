import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, WifiOff, RefreshCcw, SignalHigh, SignalLow } from 'lucide-react';
import { useSystemStore } from '../store/useSystemStore';
import { useOfflineSOS } from '../hooks/useOfflineSOS';
import { cn } from '../lib/utils';

export function PWAStatus() {
  const { isOnline } = useSystemStore();
  const { queuedCount, isSyncing, forceSync } = useOfflineSOS();

  return (
    <div className="fixed bottom-6 left-6 z-[60] flex items-center gap-3">
      <AnimatePresence>
        {queuedCount > 0 && (
          <motion.button
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            onClick={forceSync}
            disabled={isSyncing || !isOnline}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg backdrop-blur-xl transition-all active:scale-95",
              isOnline 
                ? "bg-info/20 border-info/40 text-info animate-pulse" 
                : "bg-white/5 border-white/10 text-white/40 grayscale"
            )}
          >
            <RefreshCcw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">
              {isSyncing ? "Syncing..." : `${queuedCount} Queued`}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div 
        layout
        className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-full border shadow-lg backdrop-blur-xl transition-all duration-500",
          isOnline ? "bg-tactical-cyan/10 border-tactical-cyan/30 text-tactical-cyan" : "bg-emergency/10 border-emergency/30 text-emergency"
        )}
      >
        {isOnline ? (
          <>
            <SignalHigh className="w-3 h-3" />
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">Link Secure</span>
            <div className="w-1.5 h-1.5 rounded-full bg-tactical-cyan animate-pulse" />
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            <span className="text-[10px] font-black uppercase tracking-widest font-mono text-emergency">Offline Mode</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emergency" />
          </>
        )}
      </motion.div>
    </div>
  );
}
