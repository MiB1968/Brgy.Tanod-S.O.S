import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, User, ShieldAlert, Clock, Info, CheckCircle, Activity, Shield } from 'lucide-react';
import { Alert, ResidentProfile } from '../types';
import ReportMap from './ReportMap';
import * as api from '../lib/api';
import socket from '../lib/socket';
import { cn } from '../lib/utils';
import FlameAnimation from './FlameAnimation';

interface AlertDetailsModalProps {
  alert: Alert | null;
  onClose: () => void;
}

export function AlertDetailsModal({ alert, onClose }: AlertDetailsModalProps) {
  const [resident, setResident] = useState<ResidentProfile | null>(null);
  const [loadingResident, setLoadingResident] = useState(false);

  useEffect(() => {
    if (alert && alert.residentId) {
      setLoadingResident(true);
      api.generic.get(`residents/${alert.residentId}`)
        .then((data) => {
          if (data) {
            setResident(data as ResidentProfile);
          } else {
             // Fallback to checking users collection
             api.generic.get(`users/${alert.residentId}`).then(uData => {
                if (uData) setResident(uData as any);
             });
          }
        })
        .finally(() => setLoadingResident(false));
    }
  }, [alert]);

  if (!alert) return null;

  const STATUS_COLORS: Record<string, string> = {
    pending: 'text-emergency bg-emergency/10 border-emergency/20',
    responding: 'text-info bg-info/10 border-info/20',
    resolved: 'text-success bg-success/10 border-success/20',
    cancelled: 'text-white/50 bg-white/5 border-white/10'
  };

  const TYPE_COLORS: Record<string, string> = {
    MEDICAL: 'text-[#00D4FF]',
    FIRE: 'text-[#FF8C00]',
    CRIME: 'text-[#FF4B4B]',
    FLOOD: 'text-[#A78BFA]'
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-[#12141A] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#12141A] z-10">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-white/5", TYPE_COLORS[alert.type])}>
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-mono tracking-wider">
                  TAC-ALERT: {alert.id.substring(0, 8).toUpperCase()}
                </h2>
                <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            
            {/* Top Grid: Resident Info & Current Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Resident & Identity */}
              <div className="glass-panel p-5 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-[#A78BFA]" />
                  <h3 className="tex-sm font-semibold tracking-widest text-[#A78BFA] uppercase">Subject Identification</h3>
                </div>
                
                {loadingResident ? (
                  <div className="animate-pulse flex space-x-4">
                    <div className="rounded-full bg-white/10 h-10 w-10"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-white/10 rounded w-3/4"></div>
                      <div className="h-4 bg-white/10 rounded w-1/2"></div>
                    </div>
                  </div>
                ) : resident ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {resident.photoURL || resident.idPhotoUrl ? (
                         <img src={resident.photoURL || resident.idPhotoUrl} className="w-12 h-12 rounded-full border border-white/10 object-cover" />
                      ) : (
                         <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/50 font-bold text-lg">
                           {resident.name?.[0] || '?'}
                         </div>
                      )}
                      <div>
                        <p className="font-bold text-lg">{resident.fullName ? resident.fullName : (resident.name || 'Unknown')}</p>
                        <p className="text-xs text-white/50 font-mono">UID: {resident.uid?.substring(0,8)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-black/30 p-2 rounded border border-white/5">
                        <p className="text-[10px] text-white/40 uppercase mb-1">Mobile Number</p>
                        <p className="font-mono text-white/80">{resident.mobileNumber || resident.phone || 'N/A'}</p>
                      </div>
                      <div className="bg-black/30 p-2 rounded border border-white/5">
                        <p className="text-[10px] text-white/40 uppercase mb-1">Registered Zone</p>
                        <p className="font-mono text-white/80">{(resident as any).zone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="bg-black/30 p-2 rounded border border-white/5">
                        <p className="text-[10px] text-white/40 uppercase mb-1">Registered Address</p>
                        <p className="text-white/80 text-xs">{resident.houseNumber} {resident.street}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-white/50 italic border border-white/5 bg-black/20 p-4 rounded-lg">
                    <User className="w-6 h-6 mb-2 opacity-50" />
                    Resident profile not found or unavailable.
                    <br/>Name registered on alert: {alert.residentName}
                  </div>
                )}
              </div>

              {/* Box 2: Current Status & Disposition */}
              <div className="glass-panel p-5 rounded-xl border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <Shield className="w-4 h-4 text-info" />
                       <h3 className="tex-sm font-semibold tracking-widest text-info uppercase">Disposition & Status</h3>
                    </div>
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", STATUS_COLORS[alert.status])}>
                      {alert.status}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-1 pb-3 border-b border-white/5">
                       <span className="text-[10px] text-white/40 uppercase">Emergency Type</span>
                       <span className={cn("font-bold capitalize text-lg", TYPE_COLORS[alert.type])}>{alert.type} Emergency</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm pt-2">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase mb-1">Assigned Unit</p>
                        <p className="font-mono text-white/90">{alert.assignedToName || 'Unassigned'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase mb-1">First Responder</p>
                        <p className="font-mono text-white/90">{alert.respondedByName || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {alert.description && (
                  <div className="mt-4 p-3 bg-[#FF4B4B]/10 border border-[#FF4B4B]/20 rounded-lg">
                    <p className="text-[10px] text-[#FF4B4B] uppercase tracking-widest mb-1 font-bold">Incoming Message</p>
                    <p className="text-sm text-white/90 italic">"{alert.description}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Analysis Section */}
            {alert.aiAnalysis && (
              <div className="glass-panel p-5 rounded-xl border border-white/5 relative overflow-hidden">
                 {alert.aiAnalysis.severityScore >= 8 && (
                    <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                      <FlameAnimation size="sm" />
                    </div>
                 )}
                 <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <h3 className="tex-sm font-semibold tracking-widest text-purple-400 uppercase">Guardian AI Intelligence Assessment</h3>
                    <div className="ml-auto flex items-center gap-2 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                      <span className="text-[10px] text-white/50 uppercase">Threat Level</span>
                      <span className={cn(
                        "font-black font-mono",
                        alert.aiAnalysis.severityScore >= 8 ? "text-emergency" :
                        alert.aiAnalysis.severityScore >= 5 ? "text-warning" : "text-info"
                      )}>{alert.aiAnalysis.severityScore}/10</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-white/80 leading-relaxed bg-black/20 p-4 rounded-lg border border-white/5 h-full">
                        {alert.aiAnalysis.summary}
                      </p>
                    </div>
                    <div className="space-y-4">
                      {alert.aiAnalysis.riskFactors?.length > 0 && (
                        <div>
                          <p className="text-[10px] text-white/40 uppercase mb-2">Identified Risk Factors</p>
                          <div className="flex flex-wrap gap-2">
                             {alert.aiAnalysis.riskFactors.map((factor: string, i: number) => (
                               <span key={i} className="px-2 py-1 bg-emergency/10 border border-emergency/20 text-emergency text-[10px] rounded uppercase font-mono">
                                 {factor}
                               </span>
                             ))}
                          </div>
                        </div>
                      )}
                      
                      {alert.aiAnalysis.recommendedResponders?.length > 0 && (
                        <div>
                          <p className="text-[10px] text-white/40 uppercase mb-2">Recommended Units</p>
                          <div className="flex flex-wrap gap-2">
                             {alert.aiAnalysis.recommendedResponders.map((unit: string, i: number) => (
                               <span key={i} className="px-2 py-1 bg-info/10 border border-info/20 text-info text-[10px] rounded uppercase font-mono">
                                 {unit}
                               </span>
                             ))}
                          </div>
                        </div>
                      )}

                      {alert.aiAnalysis.instructions?.length > 0 && (
                        <div>
                          <p className="text-[10px] text-white/40 uppercase mb-2">Instructions Transmitted to Subject</p>
                          <div className="space-y-1.5">
                             {alert.aiAnalysis.instructions.map((instruction: string, i: number) => (
                               <div key={i} className="flex items-center gap-2 text-[11px] text-white/70 italic bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                                 <CheckCircle className="w-3 h-3 text-info shrink-0" />
                                 <span>{instruction}</span>
                               </div>
                             ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            )}

            {/* Bottom Grid: Tactical Map & Action Logs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               {/* Map View */}
               <div className="glass-panel p-5 rounded-xl border border-white/5 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <MapPin className="w-4 h-4 text-emerald-400" />
                       <h3 className="tex-sm font-semibold tracking-widest text-emerald-400 uppercase">Transmitted Coordinates</h3>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-black/40 rounded-xl overflow-hidden border border-white/10 min-h-[250px] relative">
                     <ReportMap lat={alert.location.lat} lng={alert.location.lng} />
                     <div className="absolute bottom-4 left-4 z-[400] bg-black/80 backdrop-blur border border-white/10 px-3 py-2 rounded-lg text-xs font-mono text-white/70 shadow-lg">
                        LAT: {alert.location?.lat ? alert.location.lat.toFixed(6) : 'N/A'}<br/>
                        LNG: {alert.location?.lng ? alert.location.lng.toFixed(6) : 'N/A'}
                     </div>
                  </div>
               </div>

               {/* Action Logs */}
               <div className="glass-panel p-5 rounded-xl border border-white/5">
                  <div className="flex items-center mb-4 gap-2">
                     <Clock className="w-4 h-4 text-white/60" />
                     <h3 className="tex-sm font-semibold tracking-widest text-white/60 uppercase">Chronological Event Log</h3>
                  </div>

                  <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-white/5 mt-6">
                     
                     <div className="relative">
                       <div className="absolute -left-6 w-[10px] h-[10px] rounded-full bg-emergency shadow-[0_0_10px_rgba(255,75,75,0.5)] border-2 border-[#12141a]" />
                       <p className="text-xs text-white/50 mb-1">{new Date(alert.timestamp).toLocaleString()}</p>
                       <p className="text-sm font-semibold">SOS Alert Transmitted</p>
                       {alert.isManualLocation && <p className="text-xs text-white/40 mt-1">Location manually set by subject.</p>}
                     </div>

                     {alert.respondedAt && (
                       <div className="relative">
                         <div className="absolute -left-6 w-[10px] h-[10px] rounded-full bg-info shadow-[0_0_10px_rgba(59,130,246,0.5)] border-2 border-[#12141a]" />
                         <p className="text-xs text-white/50 mb-1">{new Date(alert.respondedAt).toLocaleString()}</p>
                         <p className="text-sm font-semibold">Unit Engaged & Dispatched</p>
                         <p className="text-xs text-white/40 mt-1">Confirmed by {alert.respondedByName}.</p>
                       </div>
                     )}

                     {alert.resolvedAt && (
                       <div className="relative">
                         <div className="absolute -left-6 w-[10px] h-[10px] rounded-full bg-success shadow-[0_0_10px_rgba(74,239,128,0.5)] border-2 border-[#12141a]" />
                         <p className="text-xs text-white/50 mb-1">{new Date(alert.resolvedAt).toLocaleString()}</p>
                         <p className="text-sm font-semibold text-success">Incident Stand Down</p>
                         {alert.resolutionNotes && (
                           <div className="mt-2 bg-black/30 p-3 rounded border border-white/5 text-sm text-white/80">
                             "{alert.resolutionNotes}"
                           </div>
                         )}
                       </div>
                     )}

                     {alert.status === 'cancelled' && (
                       <div className="relative">
                         <div className="absolute -left-6 w-[10px] h-[10px] rounded-full bg-white/30 border-2 border-[#12141a]" />
                         <p className="text-xs text-white/50 mb-1">Unknown time</p>
                         <p className="text-sm font-semibold text-white/50">Alert Cancelled</p>
                       </div>
                     )}

                  </div>
               </div>

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
