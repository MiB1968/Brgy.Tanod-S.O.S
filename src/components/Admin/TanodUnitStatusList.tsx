import React from 'react';
import { User, RegistryStatus, PatrolLocation } from '../../types';
import { MapPin, Shield, Zap, User as UserIcon, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useTanodStore } from '../../store/useTanodStore';

interface TanodUnitStatusListProps {
  tanods: User[];
  onUpdateStatus: (tanodId: string, status: string) => void;
}

export const TanodUnitStatusList: React.FC<TanodUnitStatusListProps> = ({ tanods, onUpdateStatus }) => {
  const { patrols } = useTanodStore();

  const patrolMap = React.useMemo(() => {
    const map: Record<string, PatrolLocation> = {};
    for (const p of patrols) {
      map[p.tanodId] = p;
    }
    return map;
  }, [patrols]);

  return (
    <div className="glass-panel border-white/5 rounded-[32px] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black italic tracking-tighter flex items-center gap-2 uppercase font-mono">
            <Shield className="w-5 h-5 text-success shadow-glow-green" />
            TANOD UNIT STATUS MATRIX
        </h3>
        <div className="flex items-center gap-2">
           <Activity className="w-3 h-3 text-success animate-pulse" />
           <span className="text-[9px] font-black uppercase text-white/40 tracking-widest font-mono">Real-time Feed</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tanods.map((tanod) => {
          const patrol = patrolMap[tanod.uid];
          const isAlive = patrol && patrol.isActive;
          const tacticalStatus = patrol?.status || (isAlive ? 'patrolling' : 'offline');

          return (
            <motion.div 
              key={tanod.uid}
              className="bg-brand-bg rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    isAlive ? "bg-success/20 shadow-glow-green" : "bg-white/5"
                  )}>
                      <UserIcon className={cn("w-5 h-5", isAlive ? "text-success" : "text-white/40")} />
                  </div>
                  <div className="min-w-0">
                      <h4 className="font-bold text-white uppercase italic tracking-tighter font-mono truncate">{tanod.name}</h4>
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-mono">{tanod.email}</p>
                  </div>
              </div>
              
              <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest font-mono">System Intel</span>
                      <span className={cn(
                        "text-[10px] font-black uppercase font-mono",
                        tacticalStatus === 'responding' ? "text-emergency animate-pulse" : (isAlive ? "text-success" : "text-white/40")
                      )}>
                        {tacticalStatus.replace('_', ' ')}
                      </span>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest font-mono">Registry Log</span>
                      <select
                          value={tanod.status}
                          onChange={(e) => onUpdateStatus(tanod.uid, e.target.value)}
                          className="bg-transparent text-[10px] font-bold text-white uppercase tracking-tight font-mono outline-none cursor-pointer hover:text-success transition-colors"
                      >
                          {['Available', 'On Patrol', 'Responding', 'Off-Duty', 'Break', 'Offline'].map(status => (
                              <option key={status} value={status} className="bg-brand-bg text-black">{status}</option>
                          ))}
                      </select>
                  </div>
                  
                  <div className="flex justify-between items-center text-[9px] text-white/30 font-mono py-1 border-t border-white/5">
                      <span className="uppercase tracking-widest">Active Task</span>
                      <span>{tanod.activeAlertId ? <Zap className="w-3 h-3 text-emergency animate-pulse" /> : '---'}</span>
                  </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
