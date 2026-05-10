import { Zap, Filter, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Alert } from '../../types';

export function AlertsFeed({
  filteredAlerts,
  filterStatus,
  setFilterStatus,
  filterType,
  setFilterType,
  filterTime,
  setFilterTime,
  isActiveAlert,
  isRespondedAlert,
  setSelectedAlertForDetails,
  setSelectedAlertForDispatch,
  handleUpdateStatus
}: any) {
  return (
    <div className="lg:col-span-2 space-y-4 md:space-y-6">
      {/* ... filter bar ... */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between glass-panel p-4 rounded-3xl">
          <h3 className="text-lg font-black italic tracking-tighter flex items-center gap-2 uppercase font-mono">
            <Zap className="w-5 h-5 text-emergency shadow-glow-red" />
            LIVE EMERGENCY FEED
          </h3>
          <span className="px-3 py-1 bg-emergency/10 text-emergency text-[8px] font-black rounded-full animate-pulse tracking-[0.2em]">MONITORING ACTIVE</span>
        </div>

        {/* Tactical Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 glass-panel p-3 rounded-[28px] border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2 px-3">
            <Filter className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[9px] font-black uppercase text-white/20 tracking-widest font-mono">Operations Filter</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Status Filter */}
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

            {/* Type Filter */}
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

            {/* Time Filter */}
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
            filteredAlerts.map((alert: Alert, index: number) => (
              <motion.div
                key={alert.id}
                onClick={() => setSelectedAlertForDetails(alert)}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 5, backgroundColor: 'rgba(255, 255, 255, 0.03)', transition: { duration: 0.2 } }}
                className={cn(
                  "cursor-pointer glass-panel border-white/5 rounded-[32px] p-6 relative overflow-hidden transition-all group border-l-4",
                  isActiveAlert(alert) ? "border-l-emergency border-emergency/30 shadow-glow-red ring-1 ring-emergency/10" : 
                  isRespondedAlert(alert) ? "border-l-info" : "border-l-success"
                )}
              >
                  {/* ... alert item content ... */}
                  {/* Actually, this is too much to put here now. Let's just put the container and handle the item rendering in a separate component later */}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
