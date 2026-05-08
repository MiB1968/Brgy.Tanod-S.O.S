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
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      const matchesSearch = log.tanodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.details.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || log.type === filterType;
      
      let matchesDate = true;
      if (dateFilter === 'TODAY') {
        const today = new Date();
        matchesDate = logDate.toDateString() === today.toDateString();
      } else if (dateFilter === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = logDate >= weekAgo;
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }, [activityLogs, searchTerm, filterType, dateFilter]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const sortedSessions = useMemo(() => {
    return [...patrolSessions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [patrolSessions]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const logsToday = activityLogs.filter(l => new Date(l.timestamp).toDateString() === today);
    const sessionsToday = patrolSessions.filter(s => new Date(s.startTime).toDateString() === today);
    
    return {
      totalToday: logsToday.length,
      alertsToday: logsToday.filter(l => l.type === 'alert_response').length,
      patrolsToday: sessionsToday.length,
      activeUnits: new Set(patrolSessions.filter(s => !s.endTime).map(s => s.tanodId)).size
    };
  }, [activityLogs, patrolSessions]);

  const activityTypes = useMemo(() => {
    const counts = activityLogs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { value: 'ALL', label: 'All', count: activityLogs.length },
      { value: 'duty_start', label: 'Duty', count: counts['duty_start'] || 0 },
      { value: 'duty_end', label: 'End', count: counts['duty_end'] || 0 },
      { value: 'alert_response', label: 'SOS', count: counts['alert_response'] || 0 },
      { value: 'patrol_marker', label: 'Patrol', count: counts['patrol_marker'] || 0 },
      { value: 'status_change', label: 'Status', count: counts['status_change'] || 0 }
    ];
  }, [activityLogs]);

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
    <div className="space-y-6">
      {/* Tactical Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Logs', value: stats.totalToday, icon: ClipboardList, color: 'text-white' },
          { label: 'SOS Responses', value: stats.alertsToday, icon: AlertCircle, color: 'text-emergency' },
          { label: 'Patrol Missions', value: stats.patrolsToday, icon: Navigation, color: 'text-info' },
          { label: 'Active Units', value: stats.activeUnits, icon: Activity, color: 'text-success' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="glass-panel p-4 rounded-3xl border-white/5 flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase text-white/30 tracking-widest font-mono">{stat.label}</span>
              <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white font-mono leading-none">{stat.value}</span>
              <span className="text-[8px] font-mono text-white/20 uppercase mb-1">Today</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 glass-panel p-4 rounded-[1.5rem] border-white/5">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
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
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            {(['ALL', 'TODAY', 'WEEK'] as const).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDateFilter(d);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter font-mono transition-all",
                  dateFilter === d ? "bg-white/10 text-white shadow-lg" : "text-white/30 hover:text-white/60"
                )}
              >
                {d === 'ALL' ? 'All Time' : d === 'TODAY' ? 'Today' : 'Last 7 Days'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full scrollbar-hide">
          {activityTypes.map(type => (
            <button
              key={type.value}
              onClick={() => {
                setFilterType(type.value);
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest font-mono whitespace-nowrap transition-all border flex items-center gap-2",
                filterType === type.value 
                  ? "bg-emergency text-white border-emergency/50 shadow-glow-red" 
                  : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10"
              )}
            >
              <span>{type.label}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[8px] border font-mono",
                filterType === type.value ? "bg-white/20 border-white/20" : "bg-white/5 border-white/5"
              )}>
                {type.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Activity Log Table */}
        <div className="glass-panel rounded-[2rem] overflow-hidden border border-white/5 flex flex-col">
          <div className="px-6 py-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ClipboardList className="w-6 h-6 text-emergency" />
              <h3 className="text-xl font-black uppercase tracking-[0.15em] text-white font-mono italic">Operational Logs</h3>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-mono text-white/30 font-bold uppercase tracking-widest">{filteredLogs.length} Entries</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto max-h-[600px] scrollbar-tactical relative">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#16191F] border-b border-white/10">
                  <th className="p-4 w-32 text-[10px] font-black uppercase tracking-widest text-white/20 font-mono">Tanod ID</th>
                  <th className="p-4 w-48 text-[10px] font-black uppercase tracking-widest text-white/20 font-mono">Name</th>
                  <th className="p-4 w-32 text-[10px] font-black uppercase tracking-widest text-white/20 font-mono text-center">Activity Type</th>
                  <th className="p-4 w-40 text-[10px] font-black uppercase tracking-widest text-white/20 font-mono">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-all group border-b border-white/5 h-20">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="text-[12px] font-bold text-white/20">#{log.tanodId?.slice(-6).toUpperCase()}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-black text-white/90 uppercase italic tracking-tighter">{log.tanodName}</span>
                        {log.details && (
                          <span className="text-[9px] text-white/20 font-medium truncate max-w-full uppercase mt-0.5">{log.details.length > 30 ? log.details.slice(0, 30) + '...' : log.details}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className={cn(
                        "inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border min-w-[100px]",
                        log.type === 'duty_start' && "bg-success/10 text-success border-success/20",
                        log.type === 'duty_end' && "bg-white/5 text-white/40 border-white/10",
                        log.type === 'alert_response' && "bg-[#FF4B4B]/20 text-[#FF4B4B] border-[#FF4B4B]/30 shadow-glow-red",
                        log.type === 'patrol_marker' && "bg-[#3498db]/20 text-[#3498db] border-[#3498db]/30",
                        log.type === 'status_change' && "bg-white/5 text-white/60 border-white/10"
                      )}>
                        {log.type.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-white/80 leading-none">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                        <span className="text-[10px] text-white/20 font-bold uppercase mt-1.5 tracking-tighter">
                          {new Date(log.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-white/20 font-mono text-xs italic">
                      SYSTEM_IDLE: No matching logs
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-white/5 bg-white/5 flex items-center justify-between">
               <div className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] font-black">
                PAGINATION_{currentPage}/{totalPages}
               </div>
               <div className="flex items-center gap-1.5">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[8px] font-black uppercase font-mono text-white/40 disabled:opacity-10 hover:bg-white/10 transition-all"
                  >
                    PREV
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[8px] font-black uppercase font-mono text-white/40 disabled:opacity-10 hover:bg-white/10 transition-all"
                  >
                    NEXT
                  </button>
               </div>
            </div>
          )}
        </div>

        {/* Patrol Route Sessions (Expandable) */}
        <div className="glass-panel rounded-[2rem] overflow-hidden border border-white/5 flex flex-col">
          <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4 text-info" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white font-mono italic">Mission Records</h3>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[550px] p-4 space-y-3 scrollbar-tactical">
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
