import { useState, useEffect, useMemo } from 'react';
import * as api from '../lib/api';
import socket from '../lib/socket';
import { FileText, Shield, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import ReportMap from './ReportMap';

export default function ReportsView() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const data = await api.generic.list('incidents');
      setReports(data);
    } catch (err) {
      console.error("Failed to fetch incidents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // In many systems incidents are terminal, but we still listen for new ones
    socket.on('incident_new', () => fetchReports());
    
    return () => {
      socket.off('incident_new');
    };
  }, []);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  
  const [appliedCategory, setAppliedCategory] = useState<string>('ALL');
  const [appliedDate, setAppliedDate] = useState<string>('');

  const filteredReports = useMemo(() => {
    let result = [...reports];
    
    // Sort Newest first
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (appliedCategory !== 'ALL') {
      result = result.filter(r => r.type.toLowerCase() === appliedCategory.toLowerCase());
    }
    
    if (appliedDate) {
      result = result.filter(r => r.date === appliedDate);
    }
    
    return result;
  }, [reports, appliedCategory, appliedDate]);

  const handleSearch = () => {
    setAppliedCategory(categoryFilter);
    setAppliedDate(dateFilter);
  };

  return (
    <div className="space-y-8">
      <div className="glass-panel p-8 md:p-12 rounded-[48px] border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-command">
        <div className="min-w-0">
          <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-white font-mono leading-none">Incident Vault</h2>
          <p className="text-white/30 font-bold text-xs md:text-sm uppercase tracking-[0.3em] font-mono mt-3">Archived Tactical Response Intelligence</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-brand-bg border border-white/5 rounded-2xl p-4 text-white font-black text-xs uppercase tracking-widest font-mono"
          >
            <option value="ALL">ALL CATEGORIES</option>
            <option value="Crime">CRIME</option>
            <option value="Fire">FIRE</option>
            <option value="Medical">MEDICAL</option>
            <option value="Flood">FLOOD</option>
          </select>
          <input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-brand-bg border border-white/5 rounded-2xl p-4 text-white font-black text-xs uppercase tracking-widest font-mono"
          />
          <button 
            onClick={handleSearch}
            className="px-6 py-4 bg-info text-black font-black italic rounded-2xl hover:bg-info/80 transition-all text-xs font-mono tracking-widest uppercase"
          >
            SEARCH
          </button>
          <button 
            onClick={() => {
              const csv = "id,type,date,status,citizen,location\n" + (filteredReports.map(r => `${r.id},${r.type},${r.date},${r.status},${r.citizen},"${r.location}"`).join('\n'));
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `incident_audit_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              document.body.removeChild(a); // Cleanup
            }}
            className="w-full md:w-auto justify-center px-10 py-5 glass-panel border-white/10 text-white font-black italic rounded-2xl hover:bg-white/5 transition-all flex items-center gap-3 text-xs font-mono tracking-widest uppercase"
          >
            <FileText className="w-5 h-5 text-info" /> DL_DATA_TRANSCRIPT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredReports.map((report) => (
          <div key={report.id} className="glass-panel border-white/5 rounded-[40px] p-8 md:p-10 space-y-8 shadow-command relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl group-hover:bg-white/10 transition-colors" />
            
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-brand-card rounded-2xl flex items-center justify-center border border-white/5 shadow-lg">
                  <Shield className="w-8 h-8 text-emergency/50" />
                </div>
                <div>
                  <h4 className="font-black text-[9px] text-emergency uppercase tracking-[0.4em] mb-2 font-mono">FILE_RECORD</h4>
                  <p className="text-2xl font-black text-white italic tracking-tighter uppercase font-mono leading-none">{report.type}</p>
                </div>
              </div>
              <span className="px-4 py-1.5 bg-success/10 border border-success/30 text-success text-[10px] font-black rounded-full uppercase font-mono italic tracking-widest">{report.status}</span>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="p-6 bg-brand-bg/50 rounded-3xl border border-white/5">
                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-3 font-mono">Mission Narrative</p>
                <div className="space-y-3">
                  <p className="font-bold text-[13px] text-white/80 font-mono italic">
                    <span className="text-white/40">Alerted By:</span> {report.citizen || 'Unknown'}
                  </p>
                  <p className="font-bold text-[13px] text-white/80 font-mono italic">
                    <span className="text-white/40">Resident Address:</span> {report.location || 'Unknown'}
                  </p>
                  <p className="font-bold text-[13px] text-white/80 font-mono italic">
                    <span className="text-white/40">Reported Details:</span> "{report.description || 'N/A'}"
                  </p>
                  <div className="pt-2 border-t border-white/5 mt-2 space-y-1">
                    <p className="font-bold text-[11px] text-white/60 font-mono italic">
                      <span className="text-white/40">Alert Time:</span> {report.timestamp ? new Date(report.timestamp).toLocaleString() : 'N/A'}
                    </p>
                    <p className="font-bold text-[11px] text-white/60 font-mono italic">
                      <span className="text-white/40">Accepted Time:</span> {report.respondedAt ? new Date(report.respondedAt).toLocaleString() : 'N/A'}
                    </p>
                    <p className="font-bold text-[11px] text-white/60 font-mono italic">
                      <span className="text-white/40">Resolved Time:</span> {report.resolvedAt ? new Date(report.resolvedAt).toLocaleString() : 'N/A'}
                    </p>
                    <p className="font-bold text-[11px] text-success font-mono italic">
                      <span className="text-white/40">Resolved By:</span> {report.respondedByName || report.tanodName || 'Unknown'}
                    </p>
                    <p className="font-bold text-[11px] text-success font-mono italic">
                      <span className="text-white/40">Admin On Duty:</span> {report.assignedToName || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {report.adminOnDuty && (
                  <div className="col-span-2 p-5 bg-brand-bg/50 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-2 font-mono">Command Admin</p>
                    <p className="text-xs font-black text-white uppercase font-mono italic tracking-tight">{report.adminOnDuty}</p>
                  </div>
                )}
                <div className="p-5 bg-brand-bg/50 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-2 font-mono">Field Operator</p>
                  <p className="text-xs font-black text-white uppercase font-mono italic tracking-tight">{report.tanodName}</p>
                </div>
                <div className="p-5 bg-brand-bg/50 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-2 font-mono">Time Index</p>
                  <p className="text-xs font-black text-white uppercase font-mono italic tracking-tight">{report.date} • {report.time}</p>
                </div>
                {report.timestamp && report.resolvedAt && (
                  <div className="col-span-2 p-6 bg-info/5 border border-info/20 rounded-3xl flex flex-col gap-4">
                     <div className="flex justify-between items-center">
                       <p className="text-[9px] font-black text-info uppercase tracking-[0.3em] font-mono">Total Duration (Alerted - Resolved)</p>
                       <p className="text-base font-black text-white uppercase font-mono italic">
                         {(() => {
                           const start = new Date(report.timestamp).getTime();
                           const end = new Date(report.resolvedAt).getTime();
                           const mins = Math.round((end - start) / 60000);
                           if (mins < 1) return '< 1M';
                           if (mins < 60) return `${mins}M`;
                           const hrs = Math.floor(mins / 60);
                           const hMins = mins % 60;
                           return `${hrs}H ${hMins}M`;
                         })()}
                       </p>
                     </div>
                     <div className="flex justify-between items-center text-[9px] text-info/50 font-black uppercase tracking-widest font-mono">
                       <span>ALERTED: {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       <span>RESOLVED: {new Date(report.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex flex-col gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-white/20" />
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] font-mono italic truncate">{report.location}</p>
              </div>
              {report.gpsLocation && (
                <div className="h-24 rounded-2xl overflow-hidden border border-white/10 opacity-60 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all">
                  <ReportMap lat={report.gpsLocation.lat} lng={report.gpsLocation.lng} />
                </div>
              )}
            </div>
          </div>
        ))}

        {reports.length === 0 && !loading && (
          <div className="col-span-full py-40 text-center glass-panel border-dashed border-white/10 rounded-[48px]">
            <FileText className="w-20 h-20 text-white/5 mx-auto mb-8" />
            <p className="text-white/20 font-black uppercase tracking-[0.4em] font-mono text-xs italic">Secure vault is empty. No files detected.</p>
          </div>
        )}
      </div>
    </div>
  );
}
