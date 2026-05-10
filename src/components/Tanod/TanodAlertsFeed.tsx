import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, MapPin, Shield, CheckCircle, AlertTriangle, Zap, ExternalLink } from 'lucide-react';
import { Alert, User } from '../../types';
import { cn } from '../../lib/utils';
import { IconNewIncident } from '../TacticalIcons';
import { DispatchAlert } from '../Admin/DispatchAlert';
import FlameAnimation from '../FlameAnimation';

interface TanodAlertsFeedProps {
  alerts: Alert[];
  profile: User | null;
  onUpdateStatus: (alert: Alert, status: Alert['status']) => Promise<void>;
  onDetails: (alert: Alert) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function TanodAlertsFeed({ alerts, profile, onUpdateStatus, onDetails }: TanodAlertsFeedProps) {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE');
  const [filterTime, setFilterTime] = useState<string>('ALL');

  const isActiveAlert = (alert: Alert) => ['pending', 'active'].includes(alert.status?.toLowerCase() || '');
  const isRespondedAlert = (alert: Alert) => alert.status?.toLowerCase() === 'responding';
  const isResolvedAlert = (alert: Alert) => ['resolved', 'cancelled'].includes(alert.status?.toLowerCase() || '');

  const filteredAlerts = alerts.filter(alert => {
    if (filterStatus === 'ACTIVE') {
      if (isResolvedAlert(alert)) return false;
    } else if (filterStatus !== 'ALL') {
      if (alert.status !== filterStatus.toLowerCase()) return false;
    }
    
    if (filterType !== 'ALL' && !alert.type.toUpperCase().includes(filterType)) return false;

    if (filterTime !== 'ALL') {
      const diffHours = (new Date().getTime() - new Date(alert.timestamp).getTime()) / (1000 * 60 * 60);
      if (filterTime === '1H' && diffHours > 1) return false;
      if (filterTime === '4H' && diffHours > 4) return false;
      if (filterTime === '24H' && diffHours > 24) return false;
    }

    return true;
  });

  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between glass-panel p-4 rounded-3xl">
          <h3 className="text-lg font-black italic tracking-tighter flex items-center gap-2 uppercase font-mono">
            <IconNewIncident className="w-5 h-5 text-emergency shadow-glow-red" glow />
            LIVE INCIDENT FEED
          </h3>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 bg-emergency rounded-full animate-pulse shadow-glow-red" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Real-time Stream</span>
          </div>
        </div>

        {/* Pending Dispatch Section */}
        {alerts.filter(a => a.status === 'pending').length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase text-emergency tracking-widest pl-2">Critical: Pending Dispatch</p>
            {alerts.filter(a => a.status === 'pending').map(alert => (
              <DispatchAlert 
                key={alert.id} 
                incident={{
                  id: alert.id,
                  tanodId: alert.assignedTo || 'pending',
                  tanodName: 'Citizen SOS',
                  timestamp: alert.timestamp,
                  location: `${alert.location.lat},${alert.location.lng}`,
                  type: alert.type,
                  description: alert.customMessage || 'No description',
                  status: 'pending'
                }}
                onDispatch={() => onUpdateStatus(alert, 'responding')}
              />
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 glass-panel p-3 rounded-[28px] border-white/5 backdrop-blur-md">
           <div className="flex flex-wrap gap-2">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-brand-bg/50 border border-white/5 rounded-xl px-3 py-1.5 text-[9px] font-black text-white/50 font-mono outline-none uppercase">
                <option value="ACTIVE">ACTIVE_ONLY</option>
                <option value="ALL">ALL_STATUS</option>
                <option value="PENDING">PENDING</option>
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-brand-bg/50 border border-white/5 rounded-xl px-3 py-1.5 text-[9px] font-black text-white/50 font-mono outline-none uppercase">
                <option value="ALL">ALL_TYPES</option>
                <option value="MEDICAL">MEDICAL</option>
                <option value="FIRE">FIRE</option>
            </select>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
           {filteredAlerts.map((alert, index) => (
             <motion.div
               key={alert.id}
               variants={itemVariants}
               initial="hidden" animate="show" exit="hidden"
               layout
               className={cn(
                 "cursor-pointer glass-panel border-white/5 rounded-[32px] p-6 relative overflow-hidden transition-all border-l-4",
                 isActiveAlert(alert) ? "border-l-emergency shadow-glow-red" : isRespondedAlert(alert) ? "border-l-info" : "border-l-success"
               )}
               onClick={() => onDetails(alert)}
             >
               <div className="flex flex-col md:flex-row gap-6">
                 <div className="flex-1 space-y-4">
                   <div className="flex items-start gap-4">
                     <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", alert.status === 'pending' ? "bg-emergency text-white" : "bg-brand-bg text-white/40")}>
                        <AlertTriangle className="w-6 h-6" />
                     </div>
                     <div>
                       <h4 className="font-black text-lg text-white font-mono uppercase italic">{alert.residentName}</h4>
                       <p className="text-[10px] text-white/40 font-bold font-mono uppercase"><MapPin className="w-3 h-3 inline mr-1" /> {new Date(alert.timestamp).toLocaleTimeString()}</p>
                     </div>
                   </div>
                   <div className="bg-brand-bg rounded-2xl p-4 border border-white/5">
                      <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-1 font-mono">Incident Type</p>
                      <p className="text-sm font-bold text-white uppercase italic font-mono">{alert.type}</p>
                   </div>
                 </div>

                 <div className="flex flex-col gap-3 justify-center shrink-0">
                    <a href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`} target="_blank" className="px-6 py-3 bg-brand-bg border border-white/10 text-white text-[10px] font-black rounded-xl font-mono text-center">GPS LINK</a>
                    {isActiveAlert(alert) && (
                      <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(alert, 'responding'); }} className="px-6 py-3 bg-emergency text-white text-[10px] font-black rounded-xl font-mono">RESPOND</button>
                    )}
                    {(isRespondedAlert(alert) || isActiveAlert(alert)) && (
                      <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(alert, 'resolved'); }} className="px-6 py-3 bg-success text-white text-[10px] font-black rounded-xl font-mono">RESOLVE</button>
                    )}
                 </div>
               </div>
             </motion.div>
           ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
