
import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Alert } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Shield, MapPin, CheckCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn } from '../lib/utils';
import { AlertDetailsModal } from './AlertDetailsModal';

export const CitizenReportTracker = ({ userId }: { userId: string }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Alert | null>(null);

  useEffect(() => {
    if (!db) return;
    // We'll show the user's alerts as 'Reports' but with a more detailed 'Terminal' view
    // In a real system, this would link to documented Incidents
    const q = query(
      collection(db, 'alerts'),
      where('residentId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    
    return onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'citizen_reports'));
  }, [userId]);

  if (reports.length === 0 && !loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-xl text-white uppercase italic tracking-tighter font-mono flex items-center gap-3">
          <Shield className="w-5 h-5 text-info" /> My Recent History
        </h3>
        <div className="text-[8px] font-mono font-black text-white/20 uppercase tracking-[0.4em]">Section_ID: ARCHIVE_LOGS</div>
      </div>

      <div className="grid gap-4">
        {reports.map((report, idx) => (
          <motion.div 
            onClick={() => setSelectedReport(report)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={report.id} 
            className="group relative cursor-pointer"
          >
            {/* Terminal Line Decorator */}
            <div className="absolute -left-3 top-0 bottom-0 w-[1px] bg-white/10 group-hover:bg-info/30 transition-colors" />
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white/10 group-hover:border-info/50 group-hover:bg-info/10 transition-all" />

            <div className="glass-panel p-5 rounded-2xl border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-30 transition-opacity">
                  <span className="text-[40px] font-black italic select-none">#{idx + 1}</span>
               </div>

               <div className="relative z-10">
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    <div className="px-3 py-1 rounded-lg bg-info/10 border border-info/20">
                      <span className="text-[9px] font-black uppercase text-info tracking-widest font-mono">
                        {report.type}
                      </span>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-lg border",
                      report.status === 'resolved' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    )}>
                      <span className="text-[9px] font-black uppercase tracking-widest font-mono">
                        {report.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/30 font-mono italic">{new Date(report.timestamp).toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-white/60">
                      <MapPin className="w-4 h-4 text-white/20" />
                      <div>
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest font-mono leading-none mb-1">Coordinates</p>
                        <p className="text-[11px] font-mono">{report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}</p>
                      </div>
                    </div>

                    {report.assignedToName && (
                      <div className="flex items-center gap-3 text-info">
                        <CheckCircle className="w-4 h-4 text-info/40" />
                        <div>
                          <p className="text-[8px] font-black text-info/40 uppercase tracking-widest font-mono leading-none mb-1">Assigned Agent</p>
                          <p className="text-[11px] font-mono uppercase font-black">{report.assignedToName}</p>
                        </div>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      {selectedReport && (
        <AlertDetailsModal
          alert={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
};
