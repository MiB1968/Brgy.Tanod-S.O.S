import { motion } from 'motion/react';
import { Volume2, VolumeX, Shield } from 'lucide-react';
import { IconOnlineTanods } from '../TacticalIcons';
import { User, TanodProfile, RegistryStatus } from '../../types';
import { cn } from '../../lib/utils';
import * as api from '../../lib/api';
import socket from '../../lib/socket';
import toast from 'react-hot-toast';

interface StatusTogglePanelProps {
  profile: User | null;
  sirenActive: boolean;
  onToggleSiren: () => void;
  updateTanodStatus: (id: string, status: RegistryStatus) => void;
}

export function StatusTogglePanel({ profile, sirenActive, onToggleSiren, updateTanodStatus }: StatusTogglePanelProps) {
  const isLocationEnabled = (profile as TanodProfile)?.isLocationSharingEnabled !== false;

  const handleStatusChange = async (newStatus: RegistryStatus) => {
    if (!profile) return;
    try {
      await api.generic.update(`users/${profile.id}`, { status: newStatus });
      
      const isOnline = ['on patrol', 'responding', 'available'].includes(newStatus.toLowerCase());
      await api.generic.update(`patrols/${profile.id}`, { 
        isActive: isOnline,
        status: newStatus.toLowerCase().includes('responding') ? 'responding' : (isOnline ? 'patrolling' : 'offline'),
        tanodName: profile.name
      });

      updateTanodStatus(profile.id, newStatus);
      socket.emit('tanod_update', { id: profile.id });
      socket.emit('patrol_update', { tanod_id: profile.id, isActive: isOnline });
    } catch(e) {
      toast.error('Tactical sync failure');
    }
  };

  const toggleLocation = async () => {
    if (!profile || !profile.id) return;
    try {
      await api.generic.update(`users/${profile.id}`, { 
        isLocationSharingEnabled: !isLocationEnabled,
        updatedAt: new Date().toISOString()
      });
      toast.success(isLocationEnabled ? 'GPS SHARING SUSPENDED' : 'GPS SHARING ACTIVE');
    } catch (e) {
      toast.error('Intel link fault');
    }
  };

  return (
    <div className="glass-panel bg-brand-bg/60 backdrop-blur-3xl border-white/5 rounded-[40px] p-8 text-white shadow-2xl overflow-hidden relative group border-t border-l border-white/10 mb-8">
       <div className="absolute top-8 right-8 flex items-center justify-center">
         <div className="absolute w-12 h-12 bg-success/20 rounded-full animate-pulse blur-2xl shadow-[0_0_15px_rgba(34,197,94,0.4)]" />
         <span className="relative text-2xl drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse">🟢</span>
       </div>
       
       <div className="relative z-10">
         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2 font-mono flex items-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
           Service Status
         </p>

         <div className="mb-4 flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5 w-fit hover:bg-white/10 transition-colors group">
           <div className="flex items-center gap-2">
             <div className={cn(
               "w-2 h-2 rounded-full transition-all",
               isLocationEnabled ? "bg-success shadow-[0_0_10px_#22c55e] animate-pulse" : "bg-white/10"
             )} />
             <div className="flex flex-col">
               <span className="text-[10px] font-mono font-black uppercase tracking-widest text-white/40 group-hover:text-white/60">Live GPS Link</span>
               <span className="text-[8px] font-mono font-bold uppercase text-white/20 tracking-tighter">
                 {isLocationEnabled ? 'TRANSMITTING' : 'ENCRYPTED_OFFLINE'}
               </span>
             </div>
           </div>
           <button
             onClick={toggleLocation}
             className={cn(
               "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border font-mono shadow-lg",
               isLocationEnabled ? "bg-success/20 text-success border-success/30 hover:bg-success/30" : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
             )}
           >
             {isLocationEnabled ? 'ON' : 'OFF'}
           </button>
         </div>

         <div className="flex flex-col">
           <span className="text-4xl font-black italic tracking-tighter uppercase font-mono text-white leading-none">STATUS:</span>
           <div className="flex items-center gap-1 mt-1">
             <select 
                value={profile?.status || 'Available'}
                onChange={(e) => handleStatusChange(e.target.value as RegistryStatus)}
                className="text-4xl font-black italic tracking-tighter uppercase font-mono text-success leading-none bg-transparent outline-none cursor-pointer hover:text-success/80 transition-colors"
             >
                <option value="Available">AVAILABLE</option>
                <option value="On Patrol">ON PATROL</option>
                <option value="Responding">RESPONDING</option>
                <option value="Offline">OFFLINE</option>
             </select>
           </div>
         </div>

         <div className="mt-8 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
               <IconOnlineTanods className="w-5 h-5 text-success/60" />
             </div>
             <div>
               <p className="text-[10px] opacity-40 uppercase tracking-widest font-mono font-black border-l border-success/30 pl-2">Designated Officer</p>
               <p className="text-sm font-bold uppercase italic tracking-tight font-mono border-l border-success/30 pl-2">{profile?.name}</p>
             </div>
           </div>

           <button 
            onClick={onToggleSiren}
            className={cn(
              "p-4 rounded-2xl border transition-all flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-widest group shadow-2xl",
              sirenActive ? "bg-emergency border-white/20 text-white animate-pulse" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
            )}
           >
             {sirenActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
             {sirenActive ? 'Stop Siren' : 'Test Siren'}
           </button>
         </div>
       </div>
       <Shield className="absolute -bottom-10 -right-10 w-48 h-48 opacity-[0.03] text-white pointer-events-none" />
    </div>
  );
}
