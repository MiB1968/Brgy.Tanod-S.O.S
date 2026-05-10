import { AlertTriangle, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { IconActiveSOS } from '../TacticalIcons';
import * as api from '../../lib/api';
import toast from 'react-hot-toast';

export function SOSBroadcastPanel({ profile }: { profile: any }) {
  return (
    <motion.div className="glass-panel border-white/10 rounded-[40px] p-8 overflow-hidden relative group">
      <div className="scanline opacity-10 pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="p-6 rounded-[32px] bg-emergency/10 border border-emergency/20 text-emergency shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse">
            <IconActiveSOS className="w-10 h-10" glow />
          </div>
          <div>
            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white font-mono">Tactical Broadcast Center</h3>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mt-1">Deploy high-priority alerts to all active units and residents</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <button 
            onClick={async () => {
              const message = window.prompt('Enter SOS Broadcast Message (e.g., Extreme Flood Evacuation):');
              if (!message) return;
              
              try {
                await api.generic.create('system_broadcasts', {
                  adminId: profile?.id,
                  adminName: profile?.name,
                  type: 'security',
                  message: message.toUpperCase(),
                  isActive: true,
                  timestamp: new Date().toISOString()
                });
                toast.success('SOS BROADCAST DEPLOYED SYSTEM-WIDE');
              } catch (error) {
                toast.error('Tactical failure deploying broadcast');
              }
            }}
            className="flex-1 md:flex-none items-center justify-center gap-3 px-8 py-5 rounded-[28px] bg-emergency text-black font-black hover:bg-emergency/90 transition-all hover:scale-[1.02] active:scale-95 uppercase tracking-[0.2em] font-mono shadow-[0_0_40px_rgba(239,68,68,0.4)] flex"
          >
            <Radio className="w-5 h-5 animate-pulse" />
            BROADCAST SYSTEM SOS
          </button>
          <button 
            onClick={async () => {
              try {
                const broadcasts = await api.generic.list('system_broadcasts?isActive=true');
                if (broadcasts.length === 0) {
                  toast.error('NO ACTIVE BROADCASTS FOUND');
                  return;
                }
                
                const batchPromises = broadcasts.map((b: any) => 
                  api.generic.update(`system_broadcasts/${b.id}`, { isActive: false })
                );
                
                // Also clear global siren
                batchPromises.push(api.system.updateSiren({ sirenActive: false }));
                
                await Promise.all(batchPromises);
                toast.success('ALL ACTIVE BROADCASTS TERMINATED');
              } catch (error) {
                console.error('Broadcast termination failed:', error);
                toast.error('Cleanup failed');
              }
            }}
            className="flex-1 md:flex-none px-8 py-5 rounded-[28px] bg-white/5 border border-white/10 text-white/60 font-black hover:bg-white/10 transition-all uppercase tracking-[0.1em] font-mono text-xs"
          >
            TERMINAL CLEAR
          </button>
        </div>
      </div>
    </motion.div>
  );
}
