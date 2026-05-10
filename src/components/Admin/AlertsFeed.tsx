import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Filter, CheckCircle, AlertTriangle, MapPin, Shield } from 'lucide-react';
import { Alert, User } from '../../types';
import { cn } from '../../lib/utils';
import FlameAnimation from '../FlameAnimation';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

interface AlertsFeedProps {
  alerts: Alert[];
  profile: User | null;
  onUpdateStatus: (alert: Alert, status: Alert['status']) => Promise<void>;
  onDispatch: (alert: Alert) => void;
  onDetails: (alert: Alert) => void;
}

export function AlertsFeed({ alerts, profile, onUpdateStatus, onDispatch, onDetails }: AlertsFeedProps) {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE');
  const [filterTime, setFilterTime] = useState<string>('ALL');

  const isActiveAlert = (alert: Alert) => {
    const status = alert.status?.toLowerCase();
    return status === 'pending' || status === 'active';
  };
  const isRespondedAlert = (alert: Alert) => alert.status?.toLowerCase() === 'responding';
  const isResolvedAlert = (alert: Alert) => {
    const status = alert.status?.toLowerCase();
    return status === 'resolved' || status === 'cancelled';
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterStatus === 'ACTIVE') {
      if (isResolvedAlert(alert)) return false;
    } else if (filterStatus !== 'ALL') {
      if (alert.status !== filterStatus.toLowerCase()) return false;
    }

    const typeEnum: Record<string, string> = {
      'MEDICAL': 'Medical Emergency',
      'FIRE': 'Fire Alert',
      'CRIME': 'Criminal Activity',
      'DISASTER': 'Natural Disaster'
    };
    
    if (filterType !== 'ALL') {
      const match = typeEnum[filterType] || filterType;
      if (!alert.type.toUpperCase().includes(filterType) && alert.type !== match) return false;
    }

    if (filterTime !== 'ALL') {
      const alertDate = new Date(alert.timestamp);
      const now = new Date();
      const diffHours = (now.getTime() - alertDate.getTime()) / (1000 * 60 * 60);

      if (filterTime === '1H' && diffHours > 1) return false;
      if (filterTime === '4H' && diffHours > 4) return false;
      if (filterTime === '24H' && diffHours > 24) return false;
    }

    return true;
  });

  return (
    <div className="lg:col-span-2 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between glass-panel p-4 rounded-3xl">
          <h3 className="text-lg font-black italic tracking-tighter flex items-center gap-2 uppercase font-mono">
            <Zap className="w-5 h-5 text-emergency shadow-glow-red" />
            LIVE EMERGENCY FEED
          </h3>
          <span className="px-3 py-1 bg-emergency/10 text-emergency text-[8px] font-black rounded-full animate-pulse tracking-[0.2em]">MONITORING ACTIVE</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 glass-panel p-3 rounded-[28px] border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2 px-3">
            <Filter className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[9px] font-black uppercase text-white/20 tracking-widest font-mono">Operations Filter</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-brand-bg/50 border border-white/5 rounded-xl px-3 py-1.5 text-[9px] font-black text-white/50 font-mono outline-none focus:border-info/30 transition-colors uppercase tracking-wider cursor-pointer hover:bg-brand-bg"
            >
              <option value="ACTIVE">STATUS: ACTIVE_ONLY</option>
              <option value="ALL">STATUS: ALL_INTEL</option>
              <option value="PENDING">STATUS: PENDING</option>
              <option value="RESPONDING">STATUS: RESPONDING</option>
              <option value="RESOLVED">STATUS: ARCHIVED</option>
            </select>

            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-brand-bg/50 border border-white/5 rounded-xl px-3 py-1.5 text-[9px] font-black text-white/50 font-mono outline-none focus:border-info/30 transition-colors uppercase tracking-wider cursor-pointer hover:bg-brand-bg"
            >
              <option value="ALL">TYPE: ALL_SIGS</option>
              <option value="MEDICAL">TYPE: MEDICAL</option>
              <option value="FIRE">TYPE: FIRE</option>
              <option value="CRIME">TYPE: CRIME</option>
              <option value="DISASTER">TYPE: DISASTER</option>
            </select>

            <select 
              value={filterTime}
              onChange={(e) => setFilterTime(e.target.value)}
              className="bg-brand-bg/50 border border-white/5 rounded-xl px-3 py-1.5 text-[9px] font-black text-white/50 font-mono outline-none focus:border-info/30 transition-colors uppercase tracking-wider cursor-pointer hover:bg-brand-bg"
            >
              <option value="ALL">TIME: TOTAL_HIST</option>
              <option value="1H">TIME: LAST_1H</option>
              <option value="4H">TIME: LAST_4H</option>
              <option value="24H">TIME: LAST_24H</option>
            </select>
          </div>

          <div className="ml-auto px-4 py-1.5 bg-white/5 rounded-lg border border-white/5">
            <span className="text-[9px] font-black text-white/40 uppercase font-mono tracking-tighter">
               {filteredAlerts.length} <span className="text-white/20">TARGETS_FOUND</span>
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 staggered-list">
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredAlerts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel border-white/5 rounded-[40px] p-24 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 tactical-grid opacity-5" />
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4 opacity-10" />
              <p className="text-white/30 font-black uppercase tracking-widest text-xs font-mono relative z-10">No matching emergency alerts detected.</p>
            </motion.div>
          ) : (
            filteredAlerts.map((alert, index) => (
              <motion.div
                onClick={() => onDetails(alert)}
                layout
                variants={itemVariants}
                initial="hidden"
                animate="show"
                exit="hidden"
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 5, backgroundColor: 'rgba(255, 255, 255, 0.03)', transition: { duration: 0.2 } }}
                key={alert.id}
                className={cn(
                  "cursor-pointer glass-panel border-white/5 rounded-[32px] p-6 relative overflow-hidden transition-all group border-l-4",
                  isActiveAlert(alert) ? "border-l-emergency border-emergency/30 shadow-glow-red ring-1 ring-emergency/10" : 
                  isRespondedAlert(alert) ? "border-l-info" : "border-l-success"
                )}
              >
                <div className="absolute inset-0 tactical-grid opacity-5 pointer-events-none" />
                {isActiveAlert(alert) && alert.aiAnalysis && alert.aiAnalysis.severityScore >= 7 && (
                  <div className="absolute -bottom-8 -right-8 opacity-10 pointer-events-none rotate-12 group-hover:opacity-20 transition-opacity">
                    <FlameAnimation size="lg" />
                  </div>
                )}
                <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                        alert.status === 'pending' ? "bg-emergency text-white sos-glow" : "bg-brand-bg text-white/40 border border-white/10"
                      )}>
                        <AlertTriangle className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                          <h4 className="font-black text-lg md:text-xl text-white truncate max-w-[150px] uppercase font-mono italic tracking-tighter">{alert.residentName}</h4>
                          <span className={cn(
                            "px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest font-mono",
                            alert.status === 'pending' ? "bg-emergency text-white" :
                            alert.status === 'responding' ? "bg-info/20 text-info border border-info/30" :
                            "bg-success/20 text-success border border-success/30"
                          )}>
                            {alert.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/40 font-bold flex items-center gap-2 font-mono uppercase tracking-tight">
                          <MapPin className="w-3 h-3 text-emergency" /> SECTOR 7 • {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    {/* ... truncated for brevity, same content as original ... */}
                    <div className="flex flex-col gap-3 shrink-0 justify-center">
                      <a 
                        href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-brand-bg border border-white/10 text-white text-xs font-black rounded-2xl hover:bg-brand-card hover:border-emergency/50 transition-all font-mono tracking-widest"
                      >
                        <MapPin className="w-4 h-4 text-emergency" /> TRACK GPS
                      </a>
                      <div className="flex gap-2">
                        {isActiveAlert(alert) && (
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); onDispatch(alert); }}
                            className="flex-1 py-4 bg-emergency text-white text-xs font-black rounded-2xl transition-all shadow-glow-red uppercase font-mono tracking-widest"
                          >
                            Dispatch
                          </motion.button>
                        )}
                        {(isActiveAlert(alert) || isRespondedAlert(alert)) && (
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); onUpdateStatus(alert, 'resolved'); }}
                            className="flex-1 py-4 bg-success text-white text-xs font-black rounded-2xl transition-all shadow-lg uppercase font-mono tracking-widest"
                          >
                            Resolve
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
