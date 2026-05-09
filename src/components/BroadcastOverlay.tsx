
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconActiveSOS } from './TacticalIcons';
import { Clock, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { SystemBroadcast, Alert } from '../types';
import { db, updateDoc, doc } from '../lib/firebase';
import toast from 'react-hot-toast';

interface BroadcastOverlayProps {
  activeBroadcast: SystemBroadcast | null;
  effectiveRole: string;
  alerts: Alert[];
  setActiveTab: (tab: string) => void;
}

export const BroadcastOverlay: React.FC<BroadcastOverlayProps> = ({ 
  activeBroadcast, 
  effectiveRole, 
  alerts, 
  setActiveTab 
}) => {
  if (!activeBroadcast) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-emergency/40"
      >
        <div className="glass-panel border-emergency/50 bg-brand-bg/95 rounded-[48px] p-8 md:p-12 max-w-2xl w-full text-center relative overflow-hidden shadow-[0_0_100px_rgba(239,68,68,0.4)]">
          <div className="scanline opacity-20 pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-1 bg-emergency animate-pulse" />
          
          <div className="flex justify-center mb-8">
            <div className="p-8 rounded-[40px] bg-emergency border-4 border-white animate-bounce shadow-glow-red">
              <IconActiveSOS className="w-16 h-16 text-white" glow />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-emergency mb-4 animate-pulse">
            SYSTEM-WIDE SOS
          </h1>
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.4em] mb-8">Direct Authorized Broadcast from Command</p>
          
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 mb-8">
            <p className="text-2xl md:text-3xl font-black italic text-white uppercase font-mono leading-tight">
              "{activeBroadcast.message}"
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <p className="text-xs font-bold text-white/40 font-mono uppercase tracking-widest">
              AUTHORITY: {activeBroadcast.adminName}
            </p>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emergency/20 text-emergency text-[10px] font-black uppercase tracking-widest border border-emergency/30">
              <Clock className="w-3 h-3" />
              EMERGENCY DEPLOYED: {format(new Date(activeBroadcast.timestamp), 'HH:mm:ss')}
            </div>
          </div>

          {effectiveRole === 'tanod' && alerts.some(a => a.status === 'pending') && (
            <div className="mt-10 bg-emergency shadow-glow-red rounded-3xl p-6 border border-white/20">
              <p className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-4">Tactical Directive Active</p>
              <button 
                onClick={() => {
                  setActiveTab('map');
                  toast.success('ROUTING TO NEAREST EMERGENCY...', { icon: '📍' });
                }}
                className="w-full py-4 rounded-2xl bg-black text-white font-black uppercase tracking-widest font-mono text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Navigation className="w-4 h-4" />
                DISPATCH TO NEAREST SOS
              </button>
            </div>
          )}

          {(effectiveRole === 'admin' || effectiveRole === 'superadmin') ? (
            <button 
              onClick={async () => {
                if (activeBroadcast && db) {
                  try {
                    await updateDoc(doc(db, 'system_broadcasts', activeBroadcast.id), { isActive: false });
                    toast.success('BROADCAST TERMINATED');
                  } catch (err) {
                    toast.error('Termination failed');
                  }
                }
              }}
              className="mt-12 w-full py-5 rounded-[24px] bg-white text-black font-black uppercase tracking-[0.2em] font-mono hover:bg-white/90 active:scale-95 transition-all text-xs"
            >
              DEACTIVATE COMMAND OVERRIDE
            </button>
          ) : (
            <p className="mt-8 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] animate-pulse">Awaiting All-Clear from Command</p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
