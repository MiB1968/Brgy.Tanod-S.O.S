import { useState, useEffect } from 'react';
import * as api from '../lib/api';
import socket from '../lib/socket';
import { User, UserRole, Shift } from '../types';
import { User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import PatrolScheduler from './PatrolScheduler';

export default function ScheduleView({ role, profile }: { role: UserRole, profile: User | null }) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const data = await api.generic.list('shifts');
      setShifts(data);
    } catch (err) {
      console.error("Failed to fetch shifts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    fetchData();
    socket.on('shift_update', () => fetchData());
    
    return () => {
      socket.off('shift_update');
    };
  }, [profile]);

  if (role === 'admin' || role === 'superadmin') return <PatrolScheduler profile={profile} />;

  return (
    <div className="glass-panel border-white/5 rounded-[48px] p-8 md:p-14 shadow-command max-w-5xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-info/5 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3" />
      
      <h3 className="text-3xl md:text-4xl font-black italic tracking-tighter mb-12 border-l-8 border-emergency pl-8 uppercase font-mono text-white leading-none">
        OPERATIONAL DEPLOYMENT
      </h3>
      
      {loading ? (
        <div className="py-24 text-center animate-pulse text-white/20 font-mono font-bold tracking-widest">ESTABLISHING DATA LINK...</div>
      ) : (
        <div className="space-y-6 md:space-y-8 relative z-10">
          {shifts.map((s) => {
            const isActive = s.status === 'active';
            return (
              <div key={s.id} className={cn(
                "p-8 md:p-12 glass-panel rounded-[40px] border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 transition-all group",
                isActive && "bg-info/5 border-info/30 shadow-info/10"
              )}>
                <div className="text-center md:text-left flex-1">
                  <div className="flex items-center justify-center md:justify-start gap-4 mb-3">
                    <p className={cn("text-[10px] font-black tracking-[0.3em] font-mono", isActive ? "text-info" : "text-white/20")}>
                      T-MINUS {format(new Date(s.startTime), 'HH:mm')} - {format(new Date(s.endTime), 'HH:mm')}
                    </p>
                    {isActive && (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-info rounded-full animate-ping shadow-info/50" />
                        <span className="text-[9px] font-black text-info font-mono uppercase tracking-widest">LIVE_STATUS</span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-2xl md:text-4xl font-black tracking-tighter mb-3 italic text-white uppercase font-mono leading-none">{s.sector}</h4>
                  <p className="text-white/40 font-bold uppercase tracking-widest font-mono text-xs flex items-center justify-center md:justify-start gap-3">
                    <UserIcon className="w-5 h-5 text-info/50" /> OFFICER {s.tanodName.toUpperCase()}
                  </p>
                </div>
                <div className={cn(
                  "w-full md:w-auto px-10 py-5 rounded-2xl text-[10px] font-black tracking-[0.3em] border border-white/5 text-center font-mono italic",
                  isActive ? "bg-info text-white shadow-lg" : "bg-brand-card text-white/20"
                )}>
                  {isActive ? 'PATROL_OPERATIONAL' : s.status.toUpperCase()}
                </div>
              </div>
            );
          })}

          {shifts.length === 0 && (
            <div className="py-24 text-center text-white/10 italic font-mono font-bold tracking-[0.2em] bg-white/5 rounded-[40px] border border-dashed border-white/10 uppercase">
              No tactical shifts scheduled for current cycle.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
