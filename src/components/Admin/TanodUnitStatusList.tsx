import React from 'react';
import { User, RegistryStatus } from '../../types';
import { MapPin, Shield, Zap, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface TanodUnitStatusListProps {
  tanods: User[];
  onUpdateStatus: (tanodId: string, status: string) => void;
}

export const TanodUnitStatusList: React.FC<TanodUnitStatusListProps> = ({ tanods, onUpdateStatus }) => {
  return (
    <div className="glass-panel border-white/5 rounded-[32px] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black italic tracking-tighter flex items-center gap-2 uppercase font-mono">
            <Shield className="w-5 h-5 text-success shadow-glow-green" />
            TANOD UNIT STATUS MATRIX
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tanods.map((tanod) => (
          <motion.div 
            key={tanod.uid}
            className="bg-brand-bg rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white/40" />
                </div>
                <div className="min-w-0">
                    <h4 className="font-bold text-white uppercase italic tracking-tighter font-mono truncate">{tanod.name}</h4>
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-mono">{tanod.email}</p>
                </div>
            </div>
            
            <div className="space-y-3">
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest font-mono">Status</span>
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
        ))}
      </div>
    </div>
  );
};
