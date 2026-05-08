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
  AlertCircle,
  Download,
  Calendar,
  Filter,
  Trash2
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
  const itemsPerPage = 20;

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      const matchesSearch = (log.tanodName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (log.details?.toLowerCase() || '').includes(searchTerm.toLowerCase());
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
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activityLogs, searchTerm, filterType, dateFilter]);

  // Group logs by date for cleaner visual hierarchy
  const groupedLogs = useMemo(() => {
    const groups: { [date: string]: TanodActivityLog[] } = {};
    const startIndex = (currentPage - 1) * itemsPerPage;
    const pLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);
    
    pLogs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(log);
    });
    return groups;
  }, [filteredLogs, currentPage, itemsPerPage]);

  const sortedSessions = useMemo(() => {
    return [...patrolSessions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [patrolSessions]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

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

  const exportToCSV = () => {
    const headers = ['Tanod ID', 'Name', 'Type', 'Timestamp', 'Details', 'Response Time'];
    const rows = filteredLogs.map(log => [
      log.tanodId,
      log.tanodName,
      log.type,
      new Date(log.timestamp).toISOString(),
      log.details.replace(/,/g, ';'), // Escape commas
      log.responseTime || 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BRGY_TANOD_LOGS_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            key={stat.label}
            className="glass-panel p-4 rounded-3xl border-white/5 flex flex-col relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 transform group-hover:scale-175 transition-transform duration-500">
               <stat.icon className="w-12 h-12" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase text-white/30 tracking-widest font-mono">{stat.label}</span>
              <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white font-mono leading-none">{stat.value}</span>
              <span className="text-[8px] font-mono text-white/20 uppercase mb-1">MTD</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Control Center */}
      <div className="flex flex-col gap-4 glass-panel p-5 rounded-[2rem] border-white/5">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              placeholder="Search intel stream..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-emergency/30 focus:bg-brand-bg/80 transition-all font-mono"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              {(['ALL', 'TODAY', 'WEEK'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDateFilter(d);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter font-mono transition-all",
                    dateFilter === d ? "bg-white/10 text-white shadow-lg" : "text-white/30 hover:text-white/60"
                  )}
                >
                  {d === 'ALL' ? 'History' : d === 'TODAY' ? '24H' : '7D'}
                </button>
              ))}
            </div>
            <button 
              onClick={exportToCSV}
              className="p-3 rounded-2xl bg-info/10 border border-info/20 text-info hover:bg-info/20 transition-all group flex items-center gap-2"
              title="Export to CSV"
            >
              <Download className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase font-mono hidden md:block">Export</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full scrollbar-hide">
          <Filter className="w-3.5 h-3.5 text-white/20 mr-1 shrink-0" />
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
                "px-1.5 py-0.5 rounded-md text-[8px] border font-[600] font-mono",
                filterType === type.value ? "bg-white/20 border-white/20" : "bg-white/10 border-white/5"
              )}>
                {type.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Compressed Activity Feed */}
        <div className="glass-panel rounded-[2rem] overflow-hidden border border-white/5 flex flex-col min-h-[600px]">
          <div className="px-6 py-5 border-b border-white/5 bg-gradient-to-r from-brand-bg/50 to-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emergency/10 border border-emergency/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-emergency" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-[0.1em] text-white font-mono italic leading-none">Operational Intel</h3>
                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] font-mono mt-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Live Sync Active
                </p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl">
               <span className="text-[10px] font-mono font-black text-[#FFB800] italic uppercase tracking-[0.1em]">{filteredLogs.length} Records</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto max-h-[650px] scrollbar-tactical relative font-mono">
            {Object.keys(groupedLogs).length === 0 ? (
              <div className="p-12 text-center text-white/20 italic font-mono text-xs flex flex-col items-center gap-4">
                <ClipboardList className="w-12 h-12 opacity-10" />
                <span>NO_INTEL_AT_THIS_OFFSET</span>
              </div>
            ) : (
              Object.entries(groupedLogs).map(([date, logs]) => (
                <div key={date} className="relative">
                  <div className="sticky top-0 bg-[#161a21]/95 backdrop-blur-md px-5 py-2 z-10 border-y border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emergency/60">{date}</span>
                    <span className="text-[8px] font-black text-white/20">{logs.length} UNIT_ACTIONS</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {logs.map((log) => (
                      <div key={log.id} className="p-4 hover:bg-white/5 transition-all group flex items-start gap-4 h-[72px]">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center shrink-0 group-hover:border-white/20 transition-all">
                           <span className="text-[9px] font-black text-white/30">#{log.tanodId?.slice(-4).toUpperCase()}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[12px] font-black text-white italic uppercase truncate">{log.tanodName}</span>
                            <div className={cn(
                              "px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter border shrink-0",
                              log.type === 'duty_start' && "bg-success/10 text-success border-success/20",
                              log.type === 'duty_end' && "bg-white/5 text-white/40 border-white/10",
                              log.type === 'alert_response' && "bg-[#FF4B4B]/10 text-[#FF4B4B] border-[#FF4B4B]/20",
                              log.type === 'patrol_marker' && "bg-info/10 text-info border-info/20",
                              log.type === 'status_change' && "bg-warning/10 text-warning border-warning/20"
                            )}>
                              {log.type.split('_').pop()}
                            </div>
                          </div>
                          <p className="text-[10px] text-white/40 truncate group-hover:text-white/70 transition-colors">
                            {log.details || 'Tactical update recorded'}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-bold text-white/60 block leading-none tabular-nums">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                          </span>
                          {log.responseTime ? (
                             <span className="text-[8px] font-black text-warning shadow-glow-amber italic mt-1 block">
                               {Math.floor(log.responseTime / 60)}m{log.responseTime % 60}s RESP
                             </span>
                          ) : (
                            <span className="text-[7px] text-white/10 font-black uppercase tracking-[0.2em] mt-1 block italic opacity-0 group-hover:opacity-100 transition-opacity">Passive</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* New Footer Controls */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-white/5 bg-brand-bg/50 flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em] font-black">
                PAGINATION_STREAM • {currentPage} / {totalPages}
               </div>
               <div className="flex items-center gap-1.5">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => prev - 1);
                      document.querySelector('.scrollbar-tactical')?.scrollTo(0,0);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase font-mono text-white hover:bg-white/10 disabled:opacity-5 transition-all shadow-lg"
                  >
                    IDENT_PREV
                  </button>
                  <div className="flex items-center gap-1 px-2">
                    {[...Array(Math.min(3, totalPages))].map((_, i) => {
                      let pageNum = i + 1;
                      if (currentPage > 2) pageNum = currentPage + i - 1;
                      if (pageNum > totalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "w-6 h-6 rounded-lg text-[9px] font-black font-mono transition-all",
                            currentPage === pageNum ? "bg-emergency text-white shadow-glow-red" : "text-white/20 hover:text-white/40"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(prev => prev + 1);
                      document.querySelector('.scrollbar-tactical')?.scrollTo(0,0);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase font-mono text-white hover:bg-white/10 disabled:opacity-5 transition-all shadow-lg"
                  >
                    IDENT_NEXT
                  </button>
               </div>
            </div>
          )}
        </div>

        {/* Patrol Route Sessions (Refined) */}
        <div className="glass-panel rounded-[2rem] overflow-hidden border border-white/5 flex flex-col">
          <div className="px-6 py-5 border-b border-white/5 bg-gradient-to-r from-brand-bg/50 to-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-info/10 border border-info/20 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-info" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-[0.1em] text-white font-mono italic leading-none">Patrol Records</h3>
                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] font-mono mt-1.5">Sector Trajectories</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[650px] p-5 space-y-4 scrollbar-tactical">
             {sortedSessions.length === 0 ? (
               <div className="p-12 text-center text-white/20 italic font-mono text-xs flex flex-col items-center gap-4">
                 <Navigation className="w-12 h-12 opacity-10" />
                 <span>ZERO_PATROLS_RECORDED</span>
               </div>
             ) : (
               sortedSessions.slice(0, 15).map(session => (
                <div key={session.id} className="glass-panel border-white/5 rounded-[1.5rem] overflow-hidden group hover:border-info/30 transition-all duration-300">
                  <button 
                   onClick={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)}
                   className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                  >
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-info/20 transition-all">
                         <UserIcon className="w-5 h-5 text-white/20 group-hover:text-info transition-colors" />
                       </div>
                       <div>
                         <h4 className="text-[13px] font-black text-white/90 uppercase italic font-mono tracking-tight">{session.tanodName}</h4>
                         <div className="flex items-center gap-2 mt-1">
                           <Clock size={10} className="text-white/20" />
                           <span className="text-[8px] text-white/30 font-mono uppercase tracking-[0.1em]">
                             {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • MISSION_START
                           </span>
                         </div>
                       </div>
                     </div>
                     <div className="flex items-center gap-4 sm:gap-8">
                       <div className="text-right hidden sm:block">
                         <p className="text-[7px] font-mono text-white/20 uppercase font-black mb-1">METRIC_DUR</p>
                         <p className="text-[10px] font-bold text-white font-mono">{formatDuration(session.startTime, session.endTime)}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[7px] font-mono text-white/20 uppercase font-black mb-1">WAYPOINTS</p>
                         <p className="text-[10px] font-bold text-info font-mono">{session.route.length}</p>
                       </div>
                       <div className={cn(
                         "w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center transition-all",
                         expandedSessionId === session.id ? "bg-info/20 rotate-180" : ""
                       )}>
                          <ChevronDown size={14} className={expandedSessionId === session.id ? "text-info" : "text-white/20"} />
                       </div>
                     </div>
                  </button>
                  
                  <AnimatePresence>
                    {expandedSessionId === session.id && (
                      <motion.div 
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: "auto", opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       className="border-t border-white/5 bg-[#161a21]/50"
                      >
                        <div className="p-6">
                           <div className="flex items-center justify-between mb-5">
                             <div className="flex items-center gap-2">
                               <MapIcon size={12} className="text-info" />
                               <h5 className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] font-mono italic">Telemetry Link</h5>
                             </div>
                             <div className="px-2 py-1 bg-info/10 rounded-lg text-[8px] font-black text-info uppercase font-mono">Detailed Analysis</div>
                           </div>
                           
                           <div className="space-y-2 relative before:absolute before:left-[3px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/5">
                             {session.route.length === 0 ? (
                               <div className="py-8 text-center text-[10px] text-white/20 italic font-mono uppercase tracking-widest">Signal_Loss: Telemetry_Unavailable</div>
                             ) : (
                               session.route.map((p, idx) => (
                                 <div key={idx} className="flex items-center gap-4 text-[9px] font-mono group/point">
                                   <div className="w-2 h-2 rounded-full bg-info/20 border border-info/40 shrink-0 z-10 group-hover/point:bg-info group-hover/point:scale-125 transition-all" />
                                   <span className="text-white/60 w-16 tabular-nums">{new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                                   <span className="text-white/20 tracking-tighter shrink-0">LAT: {p.lat.toFixed(5)} LNG: {p.lng.toFixed(5)}</span>
                                   <div className="flex-1 h-[1px] bg-white/5 mx-2" />
                                   <span className="text-[8px] text-white/10 uppercase italic font-black">Link_OK</span>
                                 </div>
                               ))
                             )}
                           </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
