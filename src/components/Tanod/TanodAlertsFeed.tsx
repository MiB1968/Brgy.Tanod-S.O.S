import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, MapPin, Shield, CheckCircle, AlertTriangle, Zap, Radio, Signal } from 'lucide-react';
import { Alert, User } from '../../types';
import { cn, dist } from '../../lib/utils';
import { IconNewIncident } from '../TacticalIcons';
import { DispatchAlert } from '../Admin/DispatchAlert';
import { TacticalCard } from '../Tactical/TacticalCard';
import { TacticalButton } from '../Tactical/TacticalButton';
import { useTanodStore } from '../../store/useTanodStore';
import { useTTS } from '../../hooks/useTTS';

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
  const { patrols, setHighlightedPatrolId } = useTanodStore();
  
  const prevAlertsLength = useRef(alerts.length);
  const { speak } = useTTS();

  useEffect(() => {
    // Detect new incoming alerts
    if (alerts.length > prevAlertsLength.current) {
      const newAlertsCount = alerts.length - prevAlertsLength.current;
      speak(`Bagong alerto natanggap. May ${newAlertsCount} bagong emergency.`, 'en');
    }
    prevAlertsLength.current = alerts.length;
  }, [alerts.length, speak]);

  const handleDispatch = async (alert: Alert) => {
    // Find nearest patrol
    let nearest: any = null, best = Infinity;
    patrols.forEach((p:any)=>{
        if(!p.location?.lat||!p.location?.lng) return;
        const d = dist(alert.location.lat, alert.location.lng, p.location.lat, p.location.lng);
        if(d<best){ best=d; nearest=p; }
    });
    
    if (nearest) {
        setHighlightedPatrolId(nearest.tanodId);
        // Clear highlight after a few seconds
        setTimeout(() => setHighlightedPatrolId(null), 5000);
    }
    
    await onUpdateStatus(alert, 'responding');
  };

  const isActiveAlert = (alert: Alert) => ['pending', 'active'].includes(alert.status?.toLowerCase() || '');
  const isRespondedAlert = (alert: Alert) => alert.status?.toLowerCase() === 'responding';
  const isResolvedAlert = (alert: Alert) => ['resolved', 'cancelled'].includes(alert.status?.toLowerCase() || '');

  const filteredAlerts = alerts.filter(alert => {
    // If pending alerts are shown in the Critical section, exclude them from the main list 
    // to avoid duplicate key errors in React.
    if (alert.status === 'pending') return false;

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
      <TacticalCard>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black italic tracking-tighter flex items-center gap-2 uppercase font-display text-white">
            <IconNewIncident className="w-5 h-5 text-tactical-red" glow />
            LIVE INCIDENT FEED
          </h3>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 bg-tactical-red rounded-full animate-pulse shadow-[0_0_8px_var(--color-tactical-red)]" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tactical-cyan/60">Real-time Stream</span>
          </div>
        </div>

        {/* Pending Dispatch Section */}
        {alerts.filter(a => a.status === 'pending').length > 0 && (
          <div className="space-y-4 mb-6">
            <p className="text-[9px] font-black uppercase text-tactical-red tracking-widest pl-2">Critical: Pending Dispatch</p>
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
                  description: alert.description || 'No description',
                  status: 'pending'
                }}
                onDispatch={() => handleDispatch(alert)}
              />
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-tactical-dark p-3 rounded-2xl border border-tactical-cyan/20">
           <div className="flex flex-wrap gap-2">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-tactical-dark border border-tactical-cyan/30 rounded-xl px-3 py-1.5 text-[9px] font-black text-white/70 font-mono outline-none uppercase cursor-pointer">
                <option value="ACTIVE">STATUS: ACTIVE_ONLY</option>
                <option value="ALL">STATUS: ALL_STATUS</option>
                <option value="PENDING">STATUS: PENDING</option>
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-tactical-dark border border-tactical-cyan/30 rounded-xl px-3 py-1.5 text-[9px] font-black text-white/70 font-mono outline-none uppercase cursor-pointer">
                <option value="ALL">TYPE: ALL_TYPES</option>
                <option value="MEDICAL">TYPE: MEDICAL</option>
                <option value="FIRE">TYPE: FIRE</option>
            </select>
           </div>
        </div>
      </TacticalCard>

      <div className="space-y-4 staggered-list">
        <AnimatePresence mode="popLayout">
           {filteredAlerts.length === 0 ? (
             <TacticalCard className="text-center p-12">
               <CheckCircle className="w-12 h-12 text-tactical-cyan mx-auto mb-4 opacity-50" />
               <p className="text-white/40 font-black uppercase tracking-widest text-xs font-mono">No matching emergency alerts detected.</p>
             </TacticalCard>
           ) : (
             filteredAlerts.map((alert, index) => (
               <motion.div
                 key={alert.id}
                 variants={itemVariants}
                 initial="hidden" animate="show" exit="hidden"
                 layout
                 onClick={() => onDetails(alert)}
               >
                 <TacticalCard 
                    className={cn(
                      "cursor-pointer transition-all border-l-4",
                      isActiveAlert(alert) ? "border-l-tactical-red" : isRespondedAlert(alert) ? "border-l-tactical-blue" : "border-l-tactical-cyan"
                    )}
                 >
                 <div className="flex flex-col md:flex-row gap-6">
                   <div className="flex-1 space-y-4">
                     <div className="flex items-start gap-4">
                       <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", alert.status === 'pending' ? "bg-tactical-red/20 text-tactical-red" : "bg-tactical-dark text-white/40")}>
                          <AlertTriangle className="w-6 h-6" />
                       </div>
                       <div>
                         <h4 className="font-black text-lg text-white font-display uppercase italic">{alert.residentName}</h4>
                         <p className="text-[10px] text-tactical-cyan/60 font-bold font-mono uppercase tracking-tight flex items-center gap-1"><MapPin className="w-3 h-3" /> {new Date(alert.timestamp).toLocaleTimeString()}</p>
                       </div>
                     </div>
                     <div className="bg-tactical-dark p-4 rounded-xl border border-tactical-cyan/10">
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-1 font-mono">Incident Type</p>
                        <p className="text-sm font-bold text-white uppercase italic font-display">{alert.type}</p>
                     </div>
                   </div>

                   <div className="flex flex-col gap-3 justify-center shrink-0">
                      <a href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`} target="_blank" className="px-6 py-3 bg-tactical-dark border border-tactical-cyan/30 text-white text-[10px] font-black rounded-xl font-mono text-center hover:bg-tactical-cyan/10">GPS LINK</a>
                      {isActiveAlert(alert) && (
                        <TacticalButton label="RESPOND" onClick={(e) => { e.stopPropagation(); onUpdateStatus(alert, 'responding'); }} />
                      )}
                      {(isRespondedAlert(alert) || isActiveAlert(alert)) && (
                        <TacticalButton label="RESOLVE" onClick={(e) => { e.stopPropagation(); onUpdateStatus(alert, 'resolved'); }} />
                      )}
                   </div>
                 </div>
                 </TacticalCard>
               </motion.div>
             ))
           )}
        </AnimatePresence>
      </div>
    </div>
  );
}
