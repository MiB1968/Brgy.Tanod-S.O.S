import { motion } from 'motion/react';
import { Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

interface IncidentReportsSectionProps {
  recentIncidents: any[];
}

export function IncidentReportsSection({ recentIncidents }: IncidentReportsSectionProps) {
  return (
    <div className="mt-12 space-y-6">
      <div className="flex items-center justify-between glass-panel p-4 rounded-3xl">
        <h3 className="text-lg font-black italic tracking-tighter flex items-center gap-2 uppercase font-mono">
          <Shield className="w-5 h-5 text-success shadow-glow-green" />
          TACTICAL INCIDENT RECAP
        </h3>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Official Archives</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recentIncidents.length === 0 ? (
          <div className="col-span-full py-12 text-center glass-panel rounded-[32px] border-white/5">
            <p className="text-white/20 font-black uppercase text-[10px] tracking-widest font-mono italic">No archived intelligence reports found.</p>
          </div>
        ) : (
          recentIncidents.slice(0, 6).map((incident, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={incident.id || index}
              className="glass-panel border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black text-white/60 uppercase font-mono">
                  {incident.type}
                </span>
                <span className="text-[8px] font-mono text-white/20 uppercase">
                  {incident.date} @ {incident.time}
                </span>
              </div>
              <h5 className="text-sm font-bold text-white mb-2 italic tracking-tight font-mono">{incident.location}</h5>
              <p className="text-xs text-white/50 line-clamp-2 mb-4 leading-relaxed font-mono">
                {incident.description}
              </p>
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                   <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                     <Shield className="w-3 h-3 text-success" />
                   </div>
                   <span className="text-[9px] font-black text-white/40 uppercase font-mono">{incident.tanodName}</span>
                </div>
                <span className={cn(
                  "text-[8px] font-black uppercase px-2 py-0.5 rounded bg-brand-bg border font-mono",
                  incident.status === 'resolved' ? "text-success border-success/30" : "text-caution border-caution/30"
                )}>
                  {incident.status}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
