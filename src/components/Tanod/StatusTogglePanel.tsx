import { motion } from 'motion/react';
import { Volume2, VolumeX, Shield } from 'lucide-react';
import { IconOnlineTanods } from '../TacticalIcons';
import { User, TanodProfile, RegistryStatus } from '../../types';
import { cn } from '../../lib/utils';
import * as api from '../../lib/api';
import socket from '../../lib/socket';
import toast from 'react-hot-toast';
import { TacticalCard } from '../Tactical/TacticalCard';
import { TacticalButton } from '../Tactical/TacticalButton';

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
    <TacticalCard className="mb-8">
       <div className="absolute top-8 right-8 flex items-center justify-center">
         <div className="absolute w-12 h-12 bg-tactical-cyan/20 rounded-full animate-pulse blur-2xl shadow-[0_0_15px_var(--color-tactical-cyan)]" />
         <span className="relative text-2xl drop-shadow-[0_0_8px_var(--color-tactical-cyan)] animate-pulse">🟢</span>
       </div>
       
       <div className="relative z-10">
         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-tactical-cyan/60 mb-2 font-mono flex items-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-tactical-cyan animate-ping" />
           Service Status
         </p>

         <div className="mb-4 flex items-center justify-between bg-tactical-dark p-4 rounded-2xl border border-tactical-cyan/30 w-fit gap-6">
           <div className="flex items-center gap-2">
             <div className={cn(
               "w-2 h-2 rounded-full transition-all",
               isLocationEnabled ? "bg-tactical-cyan shadow-[0_0_10px_var(--color-tactical-cyan)] animate-pulse" : "bg-white/10"
             )} />
             <div className="flex flex-col">
               <span className="text-[10px] font-mono font-black uppercase tracking-widest text-white/60">Live GPS Link</span>
               <span className="text-[8px] font-mono font-bold uppercase text-tactical-cyan/60 tracking-tighter">
                 {isLocationEnabled ? 'TRANSMITTING' : 'ENCRYPTED_OFFLINE'}
               </span>
             </div>
           </div>
           
           <TacticalButton
             label={isLocationEnabled ? 'ON' : 'OFF'}
             onClick={toggleLocation}
             className={cn(
               "px-4 py-1 rounded-lg text-[9px]",
               isLocationEnabled ? "bg-tactical-cyan/20 border-tactical-cyan" : ""
             )}
           />
         </div>

         <div className="flex flex-col">
           <span className="text-4xl font-black italic tracking-tighter uppercase font-display text-white leading-none">STATUS:</span>
           <div className="flex items-center gap-1 mt-1">
             <select 
                value={profile?.status || 'Available'}
                onChange={(e) => handleStatusChange(e.target.value as RegistryStatus)}
                className="text-4xl font-black italic tracking-tighter uppercase font-display text-tactical-cyan leading-none bg-transparent outline-none cursor-pointer hover:text-tactical-cyan/80 transition-colors"
             >
                <option value="Available" className="bg-tactical-dark">AVAILABLE</option>
                <option value="On Patrol" className="bg-tactical-dark">ON PATROL</option>
                <option value="Responding" className="bg-tactical-dark">RESPONDING</option>
                <option value="Offline" className="bg-tactical-dark">OFFLINE</option>
             </select>
           </div>
         </div>

         <div className="mt-8 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-tactical-dark border border-tactical-cyan/30 flex items-center justify-center">
               <IconOnlineTanods className="w-5 h-5 text-tactical-cyan/60" />
             </div>
             <div>
               <p className="text-[10px] opacity-60 uppercase tracking-widest font-mono font-black border-l border-tactical-cyan/30 pl-2">Designated Officer</p>
               <p className="text-sm font-bold uppercase italic tracking-tight font-display border-l border-tactical-cyan/30 pl-2 text-white">{profile?.name}</p>
             </div>
           </div>

           <TacticalButton 
            onClick={onToggleSiren}
            label={sirenActive ? 'Stop Siren' : 'Test Siren'}
            danger={sirenActive}
            className={cn("p-4", sirenActive ? "animate-pulse" : "")}
           >
             {sirenActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
           </TacticalButton>
         </div>
       </div>
       <Shield className="absolute -bottom-10 -right-10 w-48 h-48 opacity-[0.05] text-tactical-cyan pointer-events-none" />
    </TacticalCard>
  );
}

