// src/components/IncidentDetailModal.tsx
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, MapPin, Calendar, Clock, User, X, Check, HeartPulse, AlertTriangle, FileText } from 'lucide-react';
import { dispatchService } from '../services/dispatchService';
import { useRBAC } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

interface IncidentDetailModalProps {
  incident: any;
  onClose: () => void;
  onStatusChange?: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  onClose,
  onStatusChange,
}) => {
  const { profile, user } = useRBAC();
  const [isUpdating, setIsUpdating] = useState(false);

  const isTanod = profile?.role === 'tanod' || profile?.role === 'admin' || profile?.role === 'superadmin';
  const currentUserId = user?.uid;

  const handleAccept = async () => {
    if (!currentUserId) {
      toast.error('Dapat naka-login para makasagot sa emergency.');
      return;
    }
    setIsUpdating(true);
    try {
      await dispatchService.acceptSOS(incident.id, currentUserId, profile?.name || 'Tanod Responder');
      toast.success('Dispatched! Sumasagot ka na sa emergency na ito.');
      onStatusChange?.();
      onClose();
    } catch (err: any) {
      toast.error(`Dispatch error: ${err.message || err}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolve = async () => {
    if (!currentUserId) return;
    setIsUpdating(true);
    try {
      await dispatchService.resolveSOS(incident.id, currentUserId);
      toast.success('Ligtas na naresolba ang emergency!');
      onStatusChange?.();
      onClose();
    } catch (err: any) {
      toast.error(`Resolution error: ${err.message || err}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getFormatDate = (timeObj: any) => {
    if (!timeObj) return 'Kasalukuyan';
    if (typeof timeObj.toDate === 'function') {
      return timeObj.toDate().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    }
    if (timeObj.seconds) {
      return new Date(timeObj.seconds * 1000).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    }
    return new Date(timeObj).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  };

  return (
    <div 
      id="incident-detail-overlay"
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-zinc-950 w-full max-w-md rounded-3xl p-6 border border-zinc-800 shadow-2xl relative overflow-hidden"
      >
        {/* Banner Glow */}
        <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />
        
        {/* Close Button */}
        <button
          id="close-incident-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title / Header */}
        <div className="items-start gap-3 mb-6 pr-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black tracking-widest text-zinc-500 font-mono">
              SOS_TACTICAL_DATA
            </span>
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
              {incident.type || 'EMERGENCY S.O.S'}
            </h3>
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mt-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              {getFormatDate(incident.timestamp)}
            </div>
          </div>
        </div>

        {/* Body content */}
        <div className="space-y-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/80 mb-6">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 font-mono block">
              Deskripsyon o Detalye
            </span>
            <p className="text-sm text-zinc-200">
              {incident.description || 'Nag-trigger ng Emergency alert mula sa S.O.S safety dashboard.'}
            </p>
          </div>

          <div className="space-y-1 border-t border-zinc-900 pt-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 font-mono block">
              Lokasyon
            </span>
            <div className="flex items-start gap-1.5 text-sm text-zinc-200">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>
                {incident.location?.address || `${incident.location?.lat?.toFixed(5) || 0}, ${incident.location?.lng?.toFixed(5) || 0}`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-3">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 font-mono block">
                Katayuan (Status)
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                incident.status === 'resolved' 
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                  : incident.status === 'responding'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
              }`}>
                {incident.status || 'pending'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 font-mono block">
                Narekord Ni
              </span>
              <div className="flex items-center gap-1 text-sm text-zinc-200 font-medium">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>{incident.residentName || 'Resident Guardian'}</span>
              </div>
            </div>
          </div>

          {/* Assigned responder info */}
          {incident.assignedTo && (
            <div className="border-t border-zinc-900 pt-3 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 font-mono block">
                Tumutugon na Tanod
              </span>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <Shield className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>{incident.assignedToName || 'Tanod Active Team'}</span>
              </div>
            </div>
          )}
          
          {/* Images preview */}
          {incident.photos && incident.photos.length > 0 && (
            <div className="border-t border-zinc-900 pt-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 font-mono block mb-2">
                Mga Kalakip na Larawan
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {incident.photos.map((photo: string, index: number) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Incident attachment ${index}`}
                    className="h-16 w-16 object-cover rounded-xl border border-zinc-800"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Operational Actions */}
        {isTanod && (
          <div className="flex gap-2.5">
            {incident.status === 'pending' && (
              <button
                id="btn-modal-respond"
                disabled={isUpdating}
                onClick={handleAccept}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-wider transition active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/20"
              >
                <Shield className="w-4 h-4" />
                {isUpdating ? 'PUMAPASOK...' : 'Tugunan ang Alerto'}
              </button>
            )}

            {incident.status === 'responding' && incident.assignedTo === currentUserId && (
              <button
                id="btn-modal-resolve"
                disabled={isUpdating}
                onClick={handleResolve}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-wider transition active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-teal-900/20"
              >
                <Check className="w-4 h-4" />
                {isUpdating ? 'PINOPROSESO...' : 'Markahan na Ligtas'}
              </button>
            )}
          </div>
        )}

        <button
          id="btn-close-bottom"
          onClick={onClose}
          className="mt-3 w-full py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-2xl transition cursor-pointer font-mono"
        >
          Isara (Close)
        </button>
      </motion.div>
    </div>
  );
};

export default IncidentDetailModal;
