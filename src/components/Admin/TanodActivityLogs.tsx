import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Map as MapIcon, 
  Clock, 
  User as UserIcon, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Activity,
  Navigation,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTanodStore } from '../../store/useTanodStore';
import { TanodActivityLog, TanodPatrolSession } from '../../types';

export function TanodActivityLogs() {
  const { activityLogs, patrolSessions } = useTanodStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const matchesSearch = log.tanodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.details.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || log.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [activityLogs, searchTerm, filterType]);

  const sortedSessions = useMemo(() => {
    return [...patrolSessions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [patrolSessions]);

  const activityTypes = [
    { value: 'ALL', label: 'All Activities' },
    { value: 'duty_start', label: 'Duty Start' },
    { value: 'duty_end', label: 'Duty End' },
    { value: 'alert_response', label: 'Alert Response' },
    { value: 'patrol_marker', label: 'Patrol Markers' },
    { value: 'status_change', label: 'Status Changes' }
  ];

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'Ongoing';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diff = Math.floor((e - s) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-8">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-panel p-6 rounded-[2rem]">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="Search tanod name or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-emergency/30 transition-all font-mono"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {activityTypes.map(type => (
            <button
              key={type.value}
              onClick={() => setFilterType(type.value)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest font-mono whitespace-nowrap transition-all border",
                filterType === type.value 
                  ? "bg-emergency text-white border-emergency shadow-glow-red" 
                  : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Activity Log Table */}
        <div className="glass-panel rounded-[2.5rem] overflow-hidden border border-white/5 flex flex-col">
          <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-emergency" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white font-mono italic">Operational Logs</h3>
            </div>
            <span className="text-[10px] font-mono text-white/30">{filteredLogs.length} Entries</span>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-bg/30">
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/40 font-mono border-b border-white/5">Tanod ID</th>
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/40 font-mono border-b border-white/5">Name</th>
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/40 font-mono border-b border-white/5">Activity Type</th>
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/40 font-mono border-b border-white/5">Timestamp</th>
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/40 font-mono border-b border-white/5">Details</th>
                  <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/40 font-mono border-b border-white/5">Response Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-[10px] font-mono text-white/40">#{log.tanodId.slice(-6).toUpperCase()}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-black text-white/80 uppercase italic font-mono">{log.tanodName}</span>
                    </td>
                    <td className="p-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter font-mono",
                        log.type === 'duty_start' && "bg-success/20 text-success border border-success/30",
                        log.type === 'duty_end' && "bg-white/10 text-white/60 border border-white/20",
                        log.type === 'alert_response' && "bg-emergency/20 text-emergency border border-emergency/30",
                        log.type === 'patrol_marker' && "bg-info/20 text-info border border-info/30"
                      )}>
                        {log.type.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="text-[8px] text-white/30 font-mono">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-[10px] text-white/60 font-medium leading-tight max-w-[200px] truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:bg-brand-bg group-hover:p-2 group-hover:rounded-lg group-hover:absolute group-hover:z-50 group-hover:border group-hover:border-white/10 group-hover:shadow-2xl">
                        {log.details}
                        {log.location && (
                          <span className="block mt-1 text-[8px] text-white/20">
                            COORD: {log.location.lat.toFixed(4)}, {log.location.lng.toFixed(4)}
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="p-4">
                      {log.responseTime ? (
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-warning font-mono italic">
                            {Math.floor(log.responseTime / 60)}m {log.responseTime % 60}s
                           </span>
                           <span className="text-[6px] text-white/20 uppercase font-mono tracking-tighter">Mission Response</span>
                        </div>
                      ) : (
                        <span className="text-[8px] text-white/10 font-mono italic">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-white/20 font-mono text-xs italic">
                      No matching activity logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Patrol Route Sessions (Expandable) */}
        <div className="glass-panel rounded-[2.5rem] overflow-hidden border border-white/5 flex flex-col">
          <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Navigation className="w-5 h-5 text-info" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white font-mono italic">Patrol Routes</h3>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[600px] p-4 space-y-4">
             {sortedSessions.map(session => (
               <div key={session.id} className="glass-panel border-white/5 rounded-3xl overflow-hidden">
                 <button 
                  onClick={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                 >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-info/10 flex items-center justify-center border border-info/20">
                        <UserIcon className="w-6 h-6 text-info" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase italic tracking-tight font-mono">{session.tanodName}</h4>
                        <p className="text-[9px] text-white/40 font-mono uppercase tracking-[0.1em]">
                          {new Date(session.startTime).toLocaleDateString()} • {new Date(session.startTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[8px] font-mono text-white/20 uppercase font-black mb-1">Duration</p>
                        <p className="text-xs font-bold text-white font-mono">{formatDuration(session.startTime, session.endTime)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-mono text-white/20 uppercase font-black mb-1">Waypoints</p>
                        <p className="text-xs font-bold text-info font-mono">{session.route.length}</p>
                      </div>
                      {expandedSessionId === session.id ? <ChevronUp className="w-5 h-5 text-white/20" /> : <ChevronDown className="w-5 h-5 text-white/20" />}
                    </div>
                 </button>
                 
                 <AnimatePresence>
                   {expandedSessionId === session.id && (
                     <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5 bg-brand-bg/50"
                     >
                       <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] font-mono">Mission Trajectory</h5>
                            <button className="text-[9px] font-black text-info uppercase font-mono hover:underline flex items-center gap-1">
                              <MapIcon size={12} /> View on Map
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            {session.route.length === 0 ? (
                              <div className="py-8 text-center text-[10px] text-white/20 italic font-mono">No telemetry recorded for this session.</div>
                            ) : (
                              session.route.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-[10px] font-mono">
                                  <div className="w-1.5 h-1.5 rounded-full bg-info/40 shrink-0" />
                                  <span className="text-white/40 w-16">{new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className="text-white/80">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span>
                                  <div className="ml-auto w-16 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                     <div className="h-full bg-info/20" style={{ width: `${(idx / session.route.length) * 100}%` }} />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
             ))}
             {patrolSessions.length === 0 && (
               <div className="p-12 text-center text-white/20 italic font-mono text-xs">
                 Awaiting first patrol patrol link...
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
