import React, { useState, useEffect } from 'react';
import * as api from '../lib/api';
import socket from '../lib/socket';
import { Eye, ShieldAlert, X, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

interface WitnessInvite {
  id: string;
  alertId: string;
  witnessUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  location: { lat: number, lng: number };
}

interface WitnessOverlayProps {
  userId: string;
}

export const WitnessOverlay: React.FC<WitnessOverlayProps> = ({ userId }) => {
  const [invites, setInvites] = useState<WitnessInvite[]>([]);

  const fetchInvites = async () => {
    try {
      const data = await api.generic.list(`witness_invites?witnessUserId=${userId}&status=pending`);
      setInvites(data);
    } catch (err) {
      console.error("Failed to fetch witness invites", err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchInvites();
    
    socket.on('witness_invite_new', (payload: any) => {
      if (payload.witnessUserId === userId) fetchInvites();
    });

    return () => {
      socket.off('witness_invite_new');
    };
  }, [userId]);

  const handleRespond = async (inviteId: string, status: 'accepted' | 'rejected') => {
    try {
      await api.generic.update(`witness_invites/${inviteId}`, { status });
      socket.emit('witness_update', { id: inviteId });
      setInvites(prev => prev.filter(inv => inv.id !== inviteId));
    } catch (e) {
      console.error("Witness response failed:", e);
    }
  };

  if (invites.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-end justify-center p-6 md:items-center md:justify-end">
      {invites.map((invite) => (
        <motion.div
          key={invite.id}
          initial={{ opacity: 0, y: 50, scale: 0.9, rotateX: 20 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-sm bg-brand-bg border-4 border-emergency overflow-hidden rounded-[32px] shadow-[0_0_80px_rgba(255,0,0,0.4)] pointer-events-auto relative"
        >
          <div className="absolute inset-0 bg-emergency/5 pointer-events-none" />
          <div className="bg-emergency p-5 flex items-center justify-between relative overflow-hidden">
            <div className="absolute inset-0 PoliceLights opacity-30 pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <Eye className="text-white animate-pulse" size={24} />
              <span className="text-lg font-black uppercase tracking-tighter italic text-white">Witness Circle Call</span>
            </div>
            <motion.div 
               animate={{ opacity: [1, 0, 1] }} 
               transition={{ repeat: Infinity, duration: 1 }}
               className="w-3 h-3 rounded-full bg-white relative z-10" 
            />
          </div>
          
          <div className="p-8 relative z-10">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-14 h-14 rounded-[20px] bg-emergency/10 border border-emergency/20 flex items-center justify-center shrink-0 shadow-inner">
                <ShieldAlert className="text-emergency w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white italic tracking-tight uppercase leading-none mb-2">Emergency Nearby</h3>
                <p className="text-white/40 text-[11px] uppercase font-mono tracking-widest leading-relaxed">
                  A neighbor in your <span className="text-emergency font-black">Witness Circle</span> has triggered an SOS. Can you provide eyes on the situation?
                </p>
              </div>
            </div>

            <motion.div 
               initial={{ x: -10, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               transition={{ delay: 0.3 }}
               className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-8 flex items-center gap-4 shadow-xl"
            >
               <div className="w-10 h-10 rounded-full bg-brand-bg flex items-center justify-center border border-white/5">
                 <MapPin className="text-emergency" size={20} />
               </div>
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] font-mono mb-1">Incident Proximity</span>
                  <span className="text-[11px] font-mono font-bold text-white uppercase italic tracking-tighter">APPROX. 500M FROM YOUR POSITION</span>
               </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRespond(invite.id, 'rejected')}
                className="py-5 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black text-white/40 uppercase tracking-widest transition-all font-mono"
              >
                IGNORE
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRespond(invite.id, 'accepted')}
                className="py-5 bg-emergency rounded-2xl text-[11px] font-black text-white uppercase tracking-widest shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all font-mono italic"
              >
                I AM WATCHING
              </motion.button>
            </div>
          </div>
          
          <div className="bg-white/[0.04] px-6 py-4 border-t border-white/5 flex justify-center backdrop-blur-md">
            <span className="text-[8px] font-mono font-black text-white/20 uppercase tracking-[0.5em] animate-pulse">SECURE_BRGY_SOS_LINE_CONNECTED</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
